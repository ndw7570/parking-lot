package com.parkingdesk.app.plate

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// 야간 플래시: 어두운 장면이 이어지면 켠다. 켠 뒤에는 밝아져도 스스로 끄지 않는다(깜빡임 방지).
// 사용자가 한 번 직접 켜고 끄면 그 뒤로는 자동 판단을 멈춘다.
class AutoTorchTest {

    @Test
    fun `turns on after enough dark frames in a row`() {
        val torch = AutoTorch(darkLuma = 50, darkFrames = 3)

        assertFalse(torch.onFrame(30))
        assertFalse(torch.onFrame(30))
        assertTrue(torch.onFrame(30))
    }

    @Test
    fun `a bright frame resets the dark streak`() {
        val torch = AutoTorch(darkLuma = 50, darkFrames = 3)

        torch.onFrame(30)
        torch.onFrame(30)
        torch.onFrame(120)

        assertFalse(torch.onFrame(30))
    }

    @Test
    fun `does not switch itself off when the torch brightens the scene`() {
        val torch = AutoTorch(darkLuma = 50, darkFrames = 1)
        assertTrue(torch.onFrame(10))

        assertTrue(torch.onFrame(200))
    }

    @Test
    fun `manual choice wins and stops auto`() {
        val torch = AutoTorch(darkLuma = 50, darkFrames = 1)

        torch.setManual(false)

        assertFalse(torch.onFrame(10))
        assertFalse(torch.onFrame(10))
    }

    @Test
    fun `average luma samples the Y plane with row stride`() {
        // 4x2 이미지, 행마다 끝에 쓰지 않는 패딩 2바이트(rowStride 6).
        val y = byteArrayOf(10, 10, 10, 10, 0, 0, 30, 30, 30, 30, 0, 0)

        assertEquals(20, AutoTorch.averageLuma(y, width = 4, height = 2, rowStride = 6, step = 1))
    }

    @Test
    fun `luma treats bytes as unsigned`() {
        val y = byteArrayOf(200.toByte(), 200.toByte())

        assertEquals(200, AutoTorch.averageLuma(y, width = 2, height = 1, rowStride = 2, step = 1))
    }
}
