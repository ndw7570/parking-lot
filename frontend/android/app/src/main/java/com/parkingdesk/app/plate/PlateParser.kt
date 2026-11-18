package com.parkingdesk.app.plate

/**
 * OCR 이 읽은 글줄에서 한국 번호판(예: 12가3456, 123가4567)을 골라낸다.
 *
 * 지역이 붙은 옛 번호판(서울12가3456)은 지역을 뗀 형태로 돌려준다. 서버 조회가 부분 일치
 * (plate_number_contains)라서 DB 에 지역까지 저장돼 있든 아니든 같은 번호로 찾힌다.
 */
object PlateParser {

    // 자가용·영업용·택배·렌터카 번호판에 쓰이는 가운데 글자. 그 밖의 글자는 오인식으로 본다.
    private const val PLATE_HANGUL =
        "가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주바사아자배하허호"

    // 앞 숫자가 더 길게 이어지면(전화번호 등) 그 일부를 번호판으로 자르지 않는다.
    private val PLATE = Regex("(?<!\\d)(\\d{2,3})([$PLATE_HANGUL])(\\d{4})(?!\\d)")

    // 번호판에는 영문이 없다. OCR 이 숫자를 비슷한 영문으로 읽은 것만 되돌린다.
    private val LOOK_ALIKES = mapOf(
        'O' to '0', 'Q' to '0', 'I' to '1', 'L' to '1', 'Z' to '2',
        'S' to '5', 'G' to '6', 'B' to '8',
    )

    fun findPlates(lines: List<String>): List<String> {
        val normalized = lines.map(::normalize).filter { it.isNotEmpty() }
        // 두 줄 번호판(서울12 / 가3456)을 위해 이웃한 줄을 붙인 것도 본다.
        val joined = normalized.zipWithNext { a, b -> a + b }
        return (normalized + joined)
            .flatMap { text -> PLATE.findAll(text).map { it.value } }
            .distinct()
    }

    private fun normalize(raw: String): String =
        raw.uppercase()
            .map { LOOK_ALIKES[it] ?: it }
            .filter { it.isDigit() || it in '가'..'힣' }
            .joinToString("")
}
