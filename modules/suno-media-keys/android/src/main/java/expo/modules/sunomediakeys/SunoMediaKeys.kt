package expo.modules.sunomediakeys

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent

/**
 * Wired headphone keys while Suno is on screen. Android hands media keys to the focused app
 * first, so they reach Suno here even when the system would route them to another app's media
 * session (System Voice is spoken by the TTS engine, not by Suno). Media sessions are untouched.
 */
internal object SunoMediaKeys {
  private const val DOUBLE_PRESS_MS = 300L

  private val mainHandler = Handler(Looper.getMainLooper())
  private var pendingSinglePress: Runnable? = null

  /** Set from JS while a story is active; otherwise keys go on to other apps as before. */
  @Volatile var enabled = false

  @Volatile var sink: ((String) -> Unit)? = null

  private fun isMediaKey(keyCode: Int) = when (keyCode) {
    KeyEvent.KEYCODE_HEADSETHOOK,
    KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
    KeyEvent.KEYCODE_MEDIA_PLAY,
    KeyEvent.KEYCODE_MEDIA_PAUSE,
    KeyEvent.KEYCODE_MEDIA_NEXT,
    KeyEvent.KEYCODE_MEDIA_PREVIOUS -> true
    else -> false
  }

  fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (!enabled || !isMediaKey(keyCode)) return false
    if (event != null && event.repeatCount > 0) return true
    when (keyCode) {
      KeyEvent.KEYCODE_MEDIA_NEXT -> emit("next")
      KeyEvent.KEYCODE_MEDIA_PREVIOUS -> emit("previous")
      KeyEvent.KEYCODE_MEDIA_PLAY -> emit("play")
      KeyEvent.KEYCODE_MEDIA_PAUSE -> emit("pause")
      KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> emit("playPause")
      // The single button on wired headphones: one press plays / pauses, two play the next story.
      KeyEvent.KEYCODE_HEADSETHOOK -> {
        val pending = pendingSinglePress
        if (pending != null) {
          mainHandler.removeCallbacks(pending)
          pendingSinglePress = null
          emit("next")
        } else {
          val single = Runnable {
            pendingSinglePress = null
            emit("playPause")
          }
          pendingSinglePress = single
          mainHandler.postDelayed(single, DOUBLE_PRESS_MS)
        }
      }
    }
    return true
  }

  /** The key-up of a key handled above, so it doesn't reach another app on its own. */
  fun onKeyUp(keyCode: Int): Boolean = enabled && isMediaKey(keyCode)

  private fun emit(key: String) {
    sink?.invoke(key)
  }
}
