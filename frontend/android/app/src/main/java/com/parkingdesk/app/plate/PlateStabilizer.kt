package com.parkingdesk.app.plate

/**
 * 장면(카메라 프레임)마다 읽힌 번호 후보를 받아, 최근 [window] 장면 중 [required] 번 이상
 * 같은 번호가 나오면 확정한다. 한 장면의 오인식(3456 -> 3458)으로 조회하지 않게 한다.
 */
class PlateStabilizer(
    private val window: Int = 5,
    private val required: Int = 3,
) {
    private var recent: List<List<String>> = emptyList()

    /** 확정되면 번호, 아니면 null. */
    fun feed(candidates: List<String>): String? {
        recent = (recent + listOf(candidates.distinct())).takeLast(window)
        return recent.flatten()
            .groupingBy { it }
            .eachCount()
            .filterValues { it >= required }
            .maxByOrNull { it.value }
            ?.key
    }
}
