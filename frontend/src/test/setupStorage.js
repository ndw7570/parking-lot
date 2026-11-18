// vitest 는 Node 에서 돈다. 브라우저 저장소(localStorage·sessionStorage)를 메모리로 흉내 낸다.
// 앱 코드가 호출 시점에 저장소를 읽으므로(데모 스위치 등) 모든 테스트에 필요하다.
function memoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

globalThis.localStorage ??= memoryStorage();
globalThis.sessionStorage ??= memoryStorage();
