package com.parkingdesk.app.plate

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// 가이드 박스: 화면에 보이는 영역 안의 비율 위치를, ML Kit 가 주는 좌표계(회전 적용된 이미지)로 옮긴다.
class PlateRoiTest {

    @Test
    fun `box in the middle of an unrotated visible area`() {
        val visible = Box(0, 0, 1000, 500)

        val roi = PlateRoi.inVisible(visible, widthRatio = 0.8f, heightRatio = 0.2f)

        assertEquals(Box(100, 200, 900, 300), roi)
    }

    @Test
    fun `crop rect of a portrait phone is rotated into upright coordinates`() {
        // 센서 이미지 1280x720(가로), 폰은 세로로 들고 있어 90도 회전.
        // 보이는 영역(cropRect)이 이미지의 가운데 1000x720 이라면, 세워 놓은 좌표에서는 720x1000.
        val crop = Box(140, 0, 1140, 720)

        val upright = PlateRoi.uprightCrop(crop, imageWidth = 1280, imageHeight = 720, rotationDegrees = 90)

        assertEquals(Box(0, 140, 720, 1140), upright)
    }

    @Test
    fun `no rotation keeps the crop`() {
        val crop = Box(10, 20, 110, 220)

        assertEquals(crop, PlateRoi.uprightCrop(crop, 640, 480, 0))
    }

    @Test
    fun `a line counts as inside when its center is in the box`() {
        val roi = Box(100, 200, 900, 300)

        assertTrue(PlateRoi.contains(roi, Box(300, 230, 700, 280)))
        assertFalse(PlateRoi.contains(roi, Box(300, 400, 700, 450)))
    }
}
