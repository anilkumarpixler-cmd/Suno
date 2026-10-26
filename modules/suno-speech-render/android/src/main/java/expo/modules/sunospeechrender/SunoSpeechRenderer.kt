package expo.modules.sunospeechrender

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import expo.modules.kotlin.Promise
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * System Voice as one audio file: Android's default TTS writes the story to a WAV that Suno's
 * player plays. Speech the engine plays itself is the engine's audio, so Android sent headphone
 * keys to other apps; with Suno playing the file they reach Suno.
 *
 * Renders run one at a time on their own thread and are cached by text + locale.
 */
internal class SunoSpeechRenderer(context: Context) {
  private val appContext = context.applicationContext
  private val worker = Executors.newSingleThreadExecutor()
  private val cacheDir = File(appContext.cacheDir, CACHE_FOLDER)
  private val utterances = ConcurrentHashMap<String, Utterance>()

  // Bumped by cancel(): queued and running renders from before stop at their next step.
  @Volatile private var generation = 0
  @Volatile private var runningKey: String? = null

  // Used on the worker thread only (and stopped from cancel()).
  @Volatile private var engine: TextToSpeech? = null

  private class Utterance {
    val finished = CountDownLatch(1)
    @Volatile var ok = false
  }

  private class Cancelled : Exception("Speech render cancelled")

  private class Wav(val file: File, val format: ByteArray, val dataOffset: Long, val dataSize: Long)

  /**
   * Resolves `{ uri, duration }` of the story's file. A `foreground` render (the story about to
   * play) stops a running render of another story first; a prefetch only queues.
   */
  fun render(parts: List<String>, locale: String, foreground: Boolean, promise: Promise?) {
    val key = cacheKey(parts, locale)
    if (foreground && runningKey != null && runningKey != key) cancel()
    val jobGeneration = generation
    worker.execute {
      try {
        val file = renderFile(key, parts, locale, jobGeneration)
        promise?.resolve(mapOf("uri" to Uri.fromFile(file).toString(), "duration" to durationOf(file)))
      } catch (e: Cancelled) {
        promise?.reject("ERR_SPEECH_RENDER_CANCELLED", e.message, null)
      } catch (e: Exception) {
        promise?.reject("ERR_SPEECH_RENDER", e.message ?: "Speech render failed", e)
      }
    }
  }

  fun cancel() {
    generation += 1
    engine?.stop()
  }

  fun shutdown() {
    cancel()
    worker.execute {
      engine?.shutdown()
      engine = null
    }
    worker.shutdown()
  }

  private fun renderFile(key: String, parts: List<String>, locale: String, jobGeneration: Int): File {
    val target = File(cacheDir, "$key.wav")
    if (target.exists()) {
      target.setLastModified(System.currentTimeMillis())
      return target
    }
    if (jobGeneration != generation) throw Cancelled()
    cacheDir.mkdirs()
    runningKey = key
    val partFiles = mutableListOf<File>()
    val tmp = File(cacheDir, "$key.wav.tmp")
    try {
      val tts = prepareEngine(locale)
      parts.forEachIndexed { index, part ->
        if (part.isBlank()) return@forEachIndexed
        if (jobGeneration != generation) throw Cancelled()
        val partFile = File(cacheDir, "$key.$index.part.wav")
        partFiles.add(partFile)
        synthesize(tts, part, partFile)
      }
      if (jobGeneration != generation) throw Cancelled()
      if (partFiles.isEmpty()) throw IllegalArgumentException("The story has no text to speak")
      joinWavs(partFiles.map(::readWav), tmp)
      if (!tmp.renameTo(target)) throw IllegalStateException("Could not save the speech file")
      trimCache()
      return target
    } finally {
      partFiles.forEach { it.delete() }
      tmp.delete()
      if (runningKey == key) runningKey = null
    }
  }

  private fun prepareEngine(locale: String): TextToSpeech {
    val tts = engine ?: createEngine().also { engine = it }
    val result = tts.setLanguage(Locale.forLanguageTag(locale))
    if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
      throw IllegalStateException("System Voice has no $locale voice installed")
    }
    // Speed is the player's (pitch kept); the file is always at the normal rate.
    tts.setPitch(1f)
    tts.setSpeechRate(1f)
    return tts
  }

  private fun createEngine(): TextToSpeech {
    val ready = CountDownLatch(1)
    var status = TextToSpeech.ERROR
    val tts = TextToSpeech(appContext) { result ->
      status = result
      ready.countDown()
    }
    if (!ready.await(INIT_TIMEOUT_S, TimeUnit.SECONDS) || status != TextToSpeech.SUCCESS) {
      tts.shutdown()
      throw IllegalStateException("System Voice is not available")
    }
    tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String) = Unit
      override fun onDone(utteranceId: String) = finish(utteranceId, true)
      @Deprecated("Deprecated in Java")
      override fun onError(utteranceId: String) = finish(utteranceId, false)
      override fun onError(utteranceId: String, errorCode: Int) = finish(utteranceId, false)
      override fun onStop(utteranceId: String, interrupted: Boolean) = finish(utteranceId, false)
    })
    return tts
  }

  private fun finish(utteranceId: String, ok: Boolean) {
    val utterance = utterances.remove(utteranceId) ?: return
    utterance.ok = ok
    utterance.finished.countDown()
  }

  private fun synthesize(tts: TextToSpeech, text: String, file: File) {
    val id = "suno-${System.nanoTime()}"
    val utterance = Utterance()
    utterances[id] = utterance
    if (tts.synthesizeToFile(text, Bundle(), file, id) != TextToSpeech.SUCCESS) {
      utterances.remove(id)
      throw IllegalStateException("System Voice could not read the story")
    }
    if (!utterance.finished.await(PART_TIMEOUT_MIN, TimeUnit.MINUTES)) {
      utterances.remove(id)
      tts.stop()
      throw IllegalStateException("System Voice took too long")
    }
    // stop() (cancel) and engine errors both end the utterance without success.
    if (!utterance.ok) throw Cancelled()
  }

  /** The `fmt ` and `data` chunks of a WAV the engine wrote. */
  private fun readWav(file: File): Wav {
    RandomAccessFile(file, "r").use { raf ->
      val riff = ByteArray(12)
      raf.readFully(riff)
      if (String(riff, 0, 4, Charsets.US_ASCII) != "RIFF" || String(riff, 8, 4, Charsets.US_ASCII) != "WAVE") {
        throw IllegalStateException("System Voice wrote an unknown audio format")
      }
      var format: ByteArray? = null
      val chunkHeader = ByteArray(8)
      while (raf.filePointer + 8 <= raf.length()) {
        raf.readFully(chunkHeader)
        val id = String(chunkHeader, 0, 4, Charsets.US_ASCII)
        val size = ByteBuffer.wrap(chunkHeader, 4, 4).order(ByteOrder.LITTLE_ENDIAN).int.toLong() and 0xffffffffL
        when (id) {
          "fmt " -> format = ByteArray(size.toInt()).also { raf.readFully(it) }
          "data" -> {
            val start = raf.filePointer
            val remaining = raf.length() - start
            // A size of 0 / past the end: the header was never fixed; the rest is audio.
            val dataSize = if (size == 0L || size > remaining) remaining else size
            return Wav(file, format ?: throw IllegalStateException("WAV without format"), start, dataSize)
          }
          else -> raf.seek(raf.filePointer + size)
        }
        if (size % 2 == 1L) raf.skipBytes(1)
      }
    }
    throw IllegalStateException("WAV without audio")
  }

  /** One continuous WAV: the parts' audio back to back under a single header. */
  private fun joinWavs(parts: List<Wav>, output: File) {
    val format = parts.first().format
    if (parts.any { !it.format.contentEquals(format) }) {
      throw IllegalStateException("System Voice parts differ in format")
    }
    val dataSize = parts.sumOf { it.dataSize }
    val header = ByteBuffer.allocate(20 + format.size + 8).order(ByteOrder.LITTLE_ENDIAN).apply {
      put("RIFF".toByteArray(Charsets.US_ASCII))
      putInt((4 + 8 + format.size + 8 + dataSize).toInt())
      put("WAVE".toByteArray(Charsets.US_ASCII))
      put("fmt ".toByteArray(Charsets.US_ASCII))
      putInt(format.size)
      put(format)
      put("data".toByteArray(Charsets.US_ASCII))
      putInt(dataSize.toInt())
    }
    FileOutputStream(output).use { out ->
      out.write(header.array())
      val target = out.channel
      parts.forEach { part ->
        FileInputStream(part.file).channel.use { source ->
          var position = part.dataOffset
          val end = part.dataOffset + part.dataSize
          while (position < end) {
            val moved = source.transferTo(position, end - position, target)
            if (moved <= 0) break
            position += moved
          }
        }
      }
    }
  }

  /** Seconds of audio in a joined file: data bytes over the format's byte rate. */
  private fun durationOf(file: File): Double {
    val wav = readWav(file)
    val byteRate = ByteBuffer.wrap(wav.format, 8, 4).order(ByteOrder.LITTLE_ENDIAN).int
    return if (byteRate > 0) wav.dataSize.toDouble() / byteRate else 0.0
  }

  /** Oldest files go first once the cache is over its limit. */
  private fun trimCache() {
    val files = cacheDir.listFiles { file -> file.name.endsWith(".wav") } ?: return
    var total = 0L
    files.sortedByDescending { it.lastModified() }.forEach { file ->
      total += file.length()
      if (total > CACHE_LIMIT_BYTES) file.delete()
    }
  }

  private fun cacheKey(parts: List<String>, locale: String): String {
    val digest = MessageDigest.getInstance("SHA-1")
    digest.update(locale.toByteArray(Charsets.UTF_8))
    digest.update(0)
    parts.forEach { digest.update(it.toByteArray(Charsets.UTF_8)) }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  companion object {
    private const val CACHE_FOLDER = "suno-speech"
    private const val CACHE_LIMIT_BYTES = 200L * 1024 * 1024
    private const val INIT_TIMEOUT_S = 10L
    private const val PART_TIMEOUT_MIN = 5L
  }
}
