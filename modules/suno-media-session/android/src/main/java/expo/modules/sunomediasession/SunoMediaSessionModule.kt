package expo.modules.sunomediasession

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class MediaStateRecord : Record {
  @Field var title: String = ""
  @Field var artist: String = ""
  @Field var album: String = ""
  @Field var durationMs: Double = 0.0
  @Field var positionMs: Double = 0.0
  @Field var speed: Double = 1.0
  @Field var playing: Boolean = false
  @Field var manageAudioFocus: Boolean = true
}

class SunoMediaSessionModule : Module() {
  private val sink: CommandSink = { payload -> sendEvent("onCommand", payload) }

  // Recording a narrator: other apps' audio pauses (transient exclusive focus) so it stays out of
  // the mic, and most players resume by themselves once the focus is given back.
  private var recordingFocus: AudioFocusRequest? = null
  private val recordingFocusListener = AudioManager.OnAudioFocusChangeListener { _ -> }

  private fun audioManager(): AudioManager {
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    return context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  }

  override fun definition() = ModuleDefinition {
    Name("SunoMediaSession")

    Events("onCommand")

    OnCreate {
      SunoMediaSessionController.commandSink = sink
    }

    OnDestroy {
      // A reload creates the new module before the old one is destroyed; keep the new sink.
      if (SunoMediaSessionController.commandSink === sink) {
        SunoMediaSessionController.commandSink = null
        SunoMediaSessionController.stop()
      }
    }

    Function("setState") { record: MediaStateRecord ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      SunoMediaSessionController.update(
        context,
        SessionState(
          title = record.title,
          artist = record.artist,
          album = record.album,
          durationMs = record.durationMs.toLong().coerceAtLeast(0),
          positionMs = record.positionMs.toLong().coerceAtLeast(0),
          speed = record.speed.toFloat(),
          playing = record.playing,
          manageAudioFocus = record.manageAudioFocus
        )
      )
    }

    Function("stop") {
      SunoMediaSessionController.stop()
    }

    Function("requestRecordingFocus") {
      val audioManager = audioManager()
      val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val request = recordingFocus ?: AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
          .setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_MEDIA)
              .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
              .build()
          )
          .setOnAudioFocusChangeListener(recordingFocusListener)
          .build()
          .also { recordingFocus = it }
        audioManager.requestAudioFocus(request)
      } else {
        @Suppress("DEPRECATION")
        audioManager.requestAudioFocus(
          recordingFocusListener,
          AudioManager.STREAM_MUSIC,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE
        )
      }
      result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    Function("abandonRecordingFocus") {
      val audioManager = audioManager()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        recordingFocus?.let { audioManager.abandonAudioFocusRequest(it) }
      } else {
        @Suppress("DEPRECATION")
        audioManager.abandonAudioFocus(recordingFocusListener)
      }
    }
  }
}
