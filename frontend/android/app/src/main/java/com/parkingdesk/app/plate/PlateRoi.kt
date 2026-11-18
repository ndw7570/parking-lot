package com.parkingdesk.app.plate

/** 좌표 사각형. android.graphics.Rect 는 JVM 단위 테스트에서 동작하지 않아 따로 둔다. */
data class Box(val left: Int, val top: Int, val right: Int, val bottom: Int) {
    val width get() = right - left
    val height get() = bottom - top
}

/**
 * 가이드 박스(ROI) 좌표 계산.
 *
 * ML Kit 는 회전을 적용한 "세워 놓은" 이미지 좌표로 글줄 위치를 준다. 화면에 보이는 영역은
 * CameraX 가 센서 이미지 좌표(cropRect)로 준다. 둘을 세워 놓은 좌표로 맞춘 뒤 박스를 잡는다.
 */
object PlateRoi {

    /** 센서 좌표의 cropRect 를 rotationDegrees 만큼 시계 방향으로 돌린 좌표로. */
    fun uprightCrop(crop: Box, imageWidth: Int, imageHeight: Int, rotationDegrees: Int): Box =
        when (rotationDegrees) {
            90 -> Box(imageHeight - crop.bottom, crop.left, imageHeight - crop.top, crop.right)
            180 -> Box(imageWidth - crop.right, imageHeight - crop.bottom, imageWidth - crop.left, imageHeight - crop.top)
            270 -> Box(crop.top, imageWidth - crop.right, crop.bottom, imageWidth - crop.left)
            else -> crop
        }

    /** 보이는 영역 가운데에 너비·높이 비율만큼의 박스. 화면에 그리는 박스와 같은 비율을 쓴다. */
    fun inVisible(visible: Box, widthRatio: Float, heightRatio: Float): Box {
        val w = (visible.width * widthRatio).toInt()
        val h = (visible.height * heightRatio).toInt()
        val left = visible.left + (visible.width - w) / 2
        val top = visible.top + (visible.height - h) / 2
        return Box(left, top, left + w, top + h)
    }

    /** 글줄의 중심이 박스 안이면 박스 안의 글자로 본다. 번호판이 박스에 살짝 걸쳐도 읽히게. */
    fun contains(roi: Box, line: Box): Boolean {
        val cx = (line.left + line.right) / 2
        val cy = (line.top + line.bottom) / 2
        return cx in roi.left..roi.right && cy in roi.top..roi.bottom
    }
}
