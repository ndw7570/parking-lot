package com.parkingdesk.app.plate

import android.Manifest
import android.app.Activity
import android.content.Intent
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * 화면(JS) 쪽 `PlateScanner.scan()` -> 카메라 인식 화면 -> `{ plate }`.
 * 취소·권한 거부는 reject 의 code 로 구분한다(CANCELLED / PERMISSION_DENIED).
 * JS 래퍼: frontend/src/lib/plateScanner.js
 */
@CapacitorPlugin(
    name = "PlateScanner",
    permissions = [Permission(alias = CAMERA, strings = [Manifest.permission.CAMERA])],
)
class PlateScannerPlugin : Plugin() {

    @PluginMethod
    fun scan(call: PluginCall) {
        if (getPermissionState(CAMERA) == PermissionState.GRANTED) {
            openScanner(call)
        } else {
            requestPermissionForAlias(CAMERA, call, "onCameraPermission")
        }
    }

    @PermissionCallback
    private fun onCameraPermission(call: PluginCall) {
        if (getPermissionState(CAMERA) == PermissionState.GRANTED) {
            openScanner(call)
        } else {
            call.reject("카메라 권한이 필요합니다.", "PERMISSION_DENIED")
        }
    }

    private fun openScanner(call: PluginCall) {
        startActivityForResult(call, Intent(context, ScanActivity::class.java), "onScanResult")
    }

    @ActivityCallback
    private fun onScanResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val plate = result.data?.getStringExtra(ScanActivity.EXTRA_PLATE)
        if (result.resultCode == Activity.RESULT_OK && plate != null) {
            call.resolve(JSObject().put("plate", plate))
        } else {
            call.reject("번호판 인식을 취소했습니다.", "CANCELLED")
        }
    }
}

private const val CAMERA = "camera"
