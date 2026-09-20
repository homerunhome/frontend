let kakaoMapsPromise: Promise<KakaoMapsNamespace> | null = null;

export function loadKakaoMaps(): Promise<KakaoMapsNamespace> {
  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao?.maps.load(() => resolve(window.kakao!.maps)));
  }

  if (kakaoMapsPromise) return kakaoMapsPromise;

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!appKey) {
    return Promise.reject(new Error('카카오 지도 JavaScript 키가 설정되지 않았습니다.'));
  }

  kakaoMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps));
    };
    script.onerror = () => reject(new Error('카카오 지도 SDK 요청에 실패했습니다.'));
    document.head.appendChild(script);
  });

  return kakaoMapsPromise;
}
