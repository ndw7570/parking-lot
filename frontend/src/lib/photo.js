// 신고 사진을 올리기 전에 폰에서 줄인다 (P005-025).
// - 긴 변 1600px, JPEG. 캔버스로 다시 그리면 촬영 위치(GPS) 같은 메타데이터가 빠진다.
// - 서버 앞단 nginx 기본 한도(1MB)를 넘지 않게 품질을 낮춰 가며 900KB 이하로 맞춘다.
const MAX_SIDE = 1600;
const TARGET_BYTES = 900 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("사진을 읽지 못했습니다."));
    };
    img.src = url;
  });
}

export function fitSize(width, height, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** @param {File} file @returns {Promise<Blob>} */
export async function shrinkPhoto(file) {
  // 최신 브라우저는 <img> 를 그릴 때 EXIF 회전을 적용한다(image-orientation: from-image 기본).
  const img = await loadImage(file);
  let { width, height } = fitSize(img.naturalWidth, img.naturalHeight);
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const quality = Math.max(0.5, 0.82 - attempt * 0.08);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) throw new Error("사진을 변환하지 못했습니다.");
    if (blob.size <= TARGET_BYTES || attempt === 5) return blob;
    if (quality <= 0.5) {
      width = Math.round(width * 0.8);
      height = Math.round(height * 0.8);
    }
  }
  throw new Error("사진을 변환하지 못했습니다.");
}
