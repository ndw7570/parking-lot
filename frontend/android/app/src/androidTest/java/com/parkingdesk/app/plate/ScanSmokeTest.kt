package com.parkingdesk.app.plate

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith

/** P005-020: 분석을 동기(Tasks.await)로 바꾼 뒤에도 카메라 화면이 죽지 않고 장면을 계속 받는지. */
@RunWith(AndroidJUnit4::class)
class ScanSmokeTest {
    @Test
    fun scannerRunsWithoutCrashing() {
        val inst = InstrumentationRegistry.getInstrumentation()
        inst.uiAutomation.grantRuntimePermission(inst.targetContext.packageName, android.Manifest.permission.CAMERA)
        val intent = Intent(inst.targetContext, ScanActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val activity = inst.startActivitySync(intent)
        Thread.sleep(8000)
        check(!activity.isFinishing && !activity.isDestroyed) { "scanner closed by itself" }
        activity.finish()
    }
}
