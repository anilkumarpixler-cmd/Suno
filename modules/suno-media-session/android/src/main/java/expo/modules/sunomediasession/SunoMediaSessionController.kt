package expo.modules.sunomediasession

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.lang.ref.WeakReference

data class SessionState(
  val title: String,
  val artist: String,
  val album: String,
  val durationMs: Long,
  val positionMs: Long,
  val speed: Float,
  val playing: Boolean,
  /** False while expo-audio plays the narrator track: its AudioModule already holds audio focus. */
  val manageAudioFocus: Boolean
)

typealias CommandSink = (Map<String, Any?>) -> Unit

/**
 * Glue between the JS module and the foreground service.
 *
 * State flows JS -> service only; commands flow service -> JS only. A state push never emits a
 * command, so the notification can't feed back into itself.
 */
internal object SunoMediaSessionController {
  private const val TAG = "SunoMediaSession"

  private val mainHandler = Handler(Looper.getMainLooper())
  private var serviceRef: WeakReference<SunoMediaSessionService>? = null
  private var isStarting = false

  @Volatile
  var state: SessionState? = null
    private set

  @Volatile
  var commandSink: CommandSink? = null

  fun update(context: Context, next: SessionState) {
    mainHandler.post {
      state = next
      val service = serviceRef?.get()
      if (service != null) {
        service.render()
        return@post
      }
      if (!isStarting) startService(context.applicationContext)
    }
  }

  fun stop() {
    mainHandler.post {
      state = null
      serviceRef?.get()?.shutdown()
    }
  }

  fun dispatch(action: String, extras: Map<String, Any?> = emptyMap()) {
    commandSink?.invoke(mapOf<String, Any?>("action" to action) + extras)
  }

  internal fun attach(service: SunoMediaSessionService) {
    serviceRef = WeakReference(service)
    isStarting = false
  }

  internal fun detach(service: SunoMediaSessionService) {
    if (serviceRef?.get() === service) serviceRef = null
    isStarting = false
  }

  private fun startService(context: Context) {
    val intent = Intent(context, SunoMediaSessionService::class.java)
    try {
      isStarting = true
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    } catch (e: Exception) {
      // Android 12+ blocks foreground-service starts while the app is in the background.
      // Speech keeps playing; the card appears on the next state push from the foreground.
      isStarting = false
      Log.w(TAG, "Could not start the media session service", e)
    }
  }
}
