/*
 * 가짜 데이터 메뉴 사진 (public/images/menu, 800px WebP) — 담당: 나현
 * 메뉴 이름으로 찾는다. 두 매장에 같은 메뉴(아메리카노 · 카페라떼 · 레몬 에이드)가 있으면 같은 사진을 쓴다.
 * 사장님이 메뉴 사진을 넣지 않은 레시피의 기본 사진으로 쓴다 (lib/api/recipes withPhoto). 바꾸면 진짜 사진이 보인다.
 * 이름에 맞는 사진도 없으면 카페 테이블 공용 사진(default.webp)을 쓴다 (11/13)
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

/** 이름에 맞는 사진이 없을 때 쓰는 공용 사진 (커피 · 빵이 있는 카페 테이블) */
const DEFAULT_MENU_PHOTO = '/images/menu/default.webp'

/** 메뉴 이름에 맞는 시연 사진 주소. 없으면 공용 사진 */
export function menuPhotoUrl(name: string): string {
  const file = MENU_PHOTO_FILE[name.trim()]
  return file ? `/images/menu/${file}.webp` : DEFAULT_MENU_PHOTO
}

/** 시연(기본) 사진 주소인지 — 진짜로 저장한 사진(BE 주소)과 구분한다 */
export const isMenuPhotoUrl = (url: string | null) => !!url?.startsWith('/images/menu/')
