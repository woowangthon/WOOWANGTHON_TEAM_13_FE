/*
 * 가짜 데이터 메뉴 사진 (public/images/menu, 800px WebP) — 담당: 나현
 * 메뉴 이름으로 찾는다. 두 매장에 같은 메뉴(아메리카노 · 카페라떼 · 레몬 에이드)가 있으면 같은 사진을 쓴다.
 * BE 가 레시피 사진(imageUrl)을 주기 전까지 시연용이다.
 */

const MENU_PHOTO_FILE: Record<string, string> = {
  아메리카노: 'americano',
  콜드브루: 'cold-brew',
  에스프레소: 'espresso',
  아인슈페너: 'einspanner',
  카페라떼: 'cafe-latte',
  바닐라라떼: 'vanilla-latte',
  딸기라떼: 'strawberry-latte',
  말차라떼: 'matcha-latte',
  '딸기 에이드': 'strawberry-ade',
  '레몬 에이드': 'lemon-ade',
  '자몽 에이드': 'grapefruit-ade',
  '딸기 스무디': 'strawberry-smoothie',
  '망고 스무디': 'mango-smoothie',
  얼그레이: 'earl-grey',
  캐모마일: 'chamomile',
  유자차: 'yuja-tea',
  크로플: 'croffle',
  '바스크 치즈케이크': 'basque-cheesecake',
  '더티 커피': 'dirty-coffee',
  '흑당 라떼': 'black-sugar-latte',
  밀크티: 'milk-tea',
}

/** 메뉴 이름에 맞는 시연 사진 주소. 없으면 null */
export function menuPhotoUrl(name: string): string | null {
  const file = MENU_PHOTO_FILE[name.trim()]
  return file ? `/images/menu/${file}.webp` : null
}
