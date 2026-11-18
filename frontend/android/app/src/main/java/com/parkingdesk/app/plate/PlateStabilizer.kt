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
        return leader()?.takeIf { it.second >= required }?.first
    }

    /** 지금 가장 많이 읽힌 번호와 횟수. 화면에 "확인 중 (2/3)"을 보여 주는 데 쓴다. */
    fun leader(): Pair<String, Int>? =
        recent.flatten()
            .groupingBy { it }
            .eachCount()
            .maxByOrNull { it.value }
            ?.toPair()

    val requiredHits: Int get() = required
}
