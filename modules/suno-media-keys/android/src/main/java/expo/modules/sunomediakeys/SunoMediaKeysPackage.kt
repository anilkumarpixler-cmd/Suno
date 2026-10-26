package expo.modules.sunomediakeys

import android.content.Context
import android.view.KeyEvent
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityHandler

/** Gets Suno's activity key events through Expo's activity delegate (no MainActivity edit). */
class SunoMediaKeysPackage : Package {
  override fun createReactActivityHandlers(activityContext: Context?): List<ReactActivityHandler> =
    listOf(
      object : ReactActivityHandler {
        override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean =
          SunoMediaKeys.onKeyDown(keyCode, event)

        override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean =
          SunoMediaKeys.onKeyUp(keyCode)
      }
    )
}
