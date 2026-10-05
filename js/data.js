// Statyczne dane aplikacji: kategorie, sklepy, kupony, nagrody, wyzwania, tłumaczenia.
// Kupony, nagrody i ceny z aplikacją są przykładowe (demo) — do ustalenia z siecią.

window.CATEGORIES = [
  { id: 'slodycze', img: 'assets/c/slodycze.webp', pl: 'Słodycze', uk: 'Солодощі' },
  { id: 'ryby', img: 'assets/c/ryba2.webp', pl: 'Ryby i kawior', uk: 'Риба та ікра' },
  { id: 'napoje', img: 'assets/c/napoje.webp', pl: 'Napoje i kwas', uk: 'Напої та квас' },
  { id: 'sosy', img: 'assets/c/sosy.webp', pl: 'Sosy i majonezy', uk: 'Соуси та майонези' },
  { id: 'przekaski', img: 'assets/c/przekaski.webp', pl: 'Przekąski', uk: 'Снеки' },
  { id: 'kawa', img: 'assets/p/1437.webp', pl: 'Kawa', uk: 'Кава' },
  { id: 'przetwory', img: 'assets/c/przetwory.webp', pl: 'Przetwory', uk: 'Консервація' },
  { id: 'pieczywo', img: 'assets/c/pieczywo.webp', pl: 'Pieczywo', uk: 'Випічка' },
];

// 16 sklepów z grafiki sieci ("Tu jesteśmy!"). Współrzędne przybliżone, godziny DEMO — do potwierdzenia z siecią.
// h: [pon-pt], [sob], [niedz] (null = zamknięte)
const H_STREET = { week: [8, 21], sat: [8, 20], sun: null };
const H_MALL = { week: [9, 21], sat: [9, 21], sun: null };
window.STORES = [
  { id: 'poz-dab', city: 'Poznań', name: 'Dąbrowskiego', addr: 'ul. Henryka Dąbrowskiego 29', lat: 52.4103, lng: 16.9033, h: H_STREET, flagship: true },
  { id: 'poz-mm', city: 'Poznań', name: 'Galeria MM', addr: 'ul. Święty Marcin 24', lat: 52.4069, lng: 16.9221, h: H_MALL },
  { id: 'poz-pestka', city: 'Poznań', name: 'Galeria Pestka', addr: 'al. Solidarności 47', lat: 52.4300, lng: 16.9310, h: H_MALL },
  { id: 'poz-king', city: 'Poznań', name: 'King Cross Marcelin', addr: 'ul. Bukowska 156', lat: 52.4000, lng: 16.8578, h: H_MALL },
  { id: 'poz-glog', city: 'Poznań', name: 'Głogowska', addr: 'ul. Głogowska 70', lat: 52.3967, lng: 16.8996, h: H_STREET },
  { id: 'wro-kam', city: 'Wrocław', name: 'Kamienna', addr: 'ul. Kamienna 143', lat: 51.0858, lng: 17.0405, h: H_STREET },
  { id: 'wro-bor', city: 'Wrocław', name: 'Borowska', addr: 'ul. Borowska 12', lat: 51.0963, lng: 17.0336, h: H_STREET },
  { id: 'lod-pus', city: 'Łódź', name: 'Puszkina', addr: 'ul. Puszkina 6a', lat: 51.7548, lng: 19.5283, h: H_STREET },
  { id: 'lod-zel', city: 'Łódź', name: 'Żeligowskiego', addr: 'ul. Żeligowskiego 46', lat: 51.7708, lng: 19.4419, h: H_STREET },
  { id: 'lod-zam', city: 'Łódź', name: 'Zamenhofa', addr: 'ul. Zamenhofa 1/3', lat: 51.7621, lng: 19.4572, h: H_STREET },
  { id: 'gda-zw', city: 'Gdańsk', name: 'Żwirki i Wigury', addr: 'ul. Żwirki i Wigury 8', lat: 54.3962, lng: 18.5878, h: H_STREET },
  { id: 'gda-gru', city: 'Gdańsk', name: 'Grunwaldzka', addr: 'al. Grunwaldzka 116', lat: 54.3812, lng: 18.6046, h: H_STREET },
  { id: 'szc-nie', city: 'Szczecin', name: 'Niepodległości', addr: 'al. Niepodległości 28', lat: 53.4268, lng: 14.5529, h: H_STREET },
  { id: 'byd-dwo', city: 'Bydgoszcz', name: 'Dworcowa', addr: 'ul. Dworcowa 19', lat: 53.1289, lng: 18.0047, h: H_STREET },
  { id: 'tor-sze', city: 'Toruń', name: 'Szeroka', addr: 'ul. Szeroka 10', lat: 53.0103, lng: 18.6085, h: H_STREET },
  { id: 'cho-gda', city: 'Chojnice', name: 'Gdańska', addr: 'ul. Gdańska 1a', lat: 53.6987, lng: 17.5596, h: H_STREET },
];
window.SHOP_PHONE = '+48690029899';
window.DELIVERY = { free: 120, fee: 14.99 };

// match: regex po nazwie produktu lub kategoria. kind: percent | fixed | gift | multiplier
window.COUPONS = [
  { id: 'kawior30', kind: 'percent', value: 30, match: { re: 'Kawior' }, img: 1990, ends: '2026-10-19',
    pl: ['−30% na kawior', 'Każdy kawior Lemberg i nie tylko'], uk: ['−30% на ікру', 'Будь-яка ікра Lemberg і не тільки'] },
  { id: 'kwas21', kind: 'gift', value: 1, match: { re: 'Monastyrskij|Osobliwy|Kwas' }, img: 1597, ends: '2026-10-12',
    pl: ['Kwas 2+1 gratis', 'Trzecia butelka kwasu za 0 zł'], uk: ['Квас 2+1 у подарунок', 'Третя пляшка квасу за 0 zł'] },
  { id: 'bon5', kind: 'fixed', value: 5, min: 50, match: { all: true }, img: 0, ends: '2026-10-31',
    pl: ['−5 zł od zakupów', 'Przy paragonie od 50 zł'], uk: ['−5 zł від покупки', 'При чеку від 50 zł'] },
  { id: 'zefir20', kind: 'percent', value: 20, match: { cat: 'slodycze', re: 'Zefir|zefir' }, img: 1421, ends: '2026-10-15',
    pl: ['−20% na zefiry', 'Wszystkie zefiry i pianki'], uk: ['−20% на зефір', 'Увесь зефір та маршмелоу'] },
  { id: 'kawa15', kind: 'percent', value: 15, match: { cat: 'kawa' }, img: 1437, ends: '2026-10-26',
    pl: ['−15% na kawę', 'Kawa ziarnista, mielona i rozpuszczalna'], uk: ['−15% на каву', 'Зернова, мелена та розчинна'] },
  { id: 'chips2x', kind: 'multiplier', value: 2, match: { cat: 'przekaski' }, img: 1540, ends: '2026-10-20',
    pl: ['×2 wianki za przekąski', 'Podwójne punkty za chipsy i grzanki'], uk: ['×2 віночки за снеки', 'Подвійні бали за чипси та грінки'] },
];

window.REWARDS = [
  { id: 'r-slon', cost: 90, re: 'Kozynak', pl: 'Kozynak słonecznikowy', uk: 'Козинак соняшниковий' },
  { id: 'r-kwas', cost: 120, re: 'Monastyrskij', pl: 'Kwas Monastyrskij 2 l', uk: 'Квас Монастирський 2 л' },
  { id: 'r-zefir', cost: 160, re: 'Zefir', pl: 'Zefir do wyboru', uk: 'Зефір на вибір' },
  { id: 'r-kawa', cost: 420, re: 'Kawa', pl: 'Kawa do wyboru', uk: 'Кава на вибір' },
  { id: 'r-bon10', cost: 600, bon: 10, pl: 'Bon 10 zł', uk: 'Ваучер 10 zł' },
  { id: 'r-tort', cost: 950, re: 'Tort Miodownik', pl: 'Tort Miodownik', uk: 'Торт Медовик' },
];

window.CHALLENGES = [
  { id: 'c-3visits', goal: 3, bonus: 100, type: 'visits', pl: ['3 zakupy w tym tygodniu', 'Zeskanuj kartę przy 3 zakupach'], uk: ['3 покупки цього тижня', 'Скануй картку під час 3 покупок'] },
  { id: 'c-kawa', goal: 1, bonus: 50, type: 'cat:kawa', pl: ['Kawowy poranek', 'Kup dowolną kawę'], uk: ['Кавовий ранок', 'Купи будь-яку каву'] },
  { id: 'c-stores', goal: 2, bonus: 80, type: 'stores', pl: ['Turysta Słowianoczki', 'Odwiedź 2 różne sklepy'], uk: ['Турист Слов’яночки', 'Відвідай 2 різні магазини'] },
];

window.LEVELS = [
  { id: 'ziarno', min: 0, pl: 'Ziarenko', uk: 'Зернятко', perks: { pl: ['1 wianek za każde 1 zł', 'Kupony tygodniowe'], uk: ['1 віночок за кожен 1 zł', 'Щотижневі купони'] } },
  { id: 'klos', min: 600, pl: 'Kłos', uk: 'Колосок', perks: { pl: ['+10% wianków do każdego zakupu', 'Prezent urodzinowy'], uk: ['+10% віночків до кожної покупки', 'Подарунок на день народження'] } },
  { id: 'wianek', min: 2000, pl: 'Złoty Wianek', uk: 'Золотий Вінок', perks: { pl: ['+25% wianków', '−5% w każdy piątek', 'Pierwszy dostęp do nowości'], uk: ['+25% віночків', '−5% щоп’ятниці', 'Першими пробуєте новинки'] } },
];

window.I18N = {
  pl: {
    brandSub: 'Delikatesy wschodnie', searchHome: 'Czego dziś szukasz?', deliveryMode: 'Dostawa', pickupMode: 'Odbiór', deliveryToday: 'Dostawa dziś', freeFrom: 'gratis od 120 zł', pickupAt: 'Odbiór w', readyIn: 'gotowe w ~1 h',
    firstTitle: '−20% na pierwsze zamówienie', firstDesc: 'Do 30 zł taniej. Naliczy się samo w koszyku.', firstOrder: 'Pierwsze zamówienie −20%', orderNow: 'Zamów teraz',
    flashKicker: 'Okazja dnia', flashEnds: 'Kończy się za', x2Title: '×2 wianki za zamówienia', x2Desc: 'Każde zamówienie w aplikacji liczy się podwójnie.', x2Note: '×2 w aplikacji',
    reorder: 'Zamów ponownie', reorderAll: 'Dodaj wszystko', bundles: 'Gotowe zestawy', bundlesDesc: '−10% za cały zestaw', addBundle: 'Dodaj zestaw', bundleDisc: 'Zestaw', toast_bundle: 'Zestaw w koszyku', toast_reorder: 'Dodano poprzednie zamówienie', goCart: 'Koszyk', freeLeft: 'do darmowej dostawy', freeDone: 'Darmowa dostawa',

    yourStore: 'Twój sklep', chooseStore: 'Wybierz sklep', choose: 'Wybierz', chosen: 'Twój sklep', chosenShort: 'Wybrany', storesIn: 'sklepów w 8 miastach', opensDay: 'otwarcie',
    days: ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'],
    cart: 'Koszyk', toCart: 'Do koszyka', inCart: 'W koszyku', cartEmpty: 'Koszyk jest pusty', cartEmptyDesc: 'Dodawaj produkty — zamówisz z dostawą albo odbierzesz w swoim sklepie.',
    toast_cart: 'Dodano do koszyka', subtotal: 'Produkty', appSave: 'Ceny z aplikacją', delivery: 'Dostawa', free: 'Gratis',
    toFree: 'Do darmowej dostawy brakuje', freeOk: 'Masz darmową dostawę', howGet: 'Jak odbierasz?', pickup: 'Odbiór w sklepie', pickupDesc: 'Gotowe w ok. 1 h', courier: 'Dostawa kurierem', courierDesc: 'Dziś lub jutro',
    street: 'Ulica i numer', city: 'Miasto', payment: 'Płatność', payBlik: 'BLIK', payCard: 'Karta', payCash: 'Przy odbiorze', payDemo: 'Demo — żadna płatność nie zostanie pobrana.',
    order: 'Zamawiam', orderDone: 'Zamówienie przyjęte!', orderNo: 'Zamówienie', orders: 'Zamówienia', noOrders: 'Nie masz jeszcze zamówień.',
    st_new: 'Przyjęte', st_pack: 'Kompletujemy', st_ready: 'Gotowe do odbioru', st_way: 'W drodze', st_done: 'Dostarczone',
    orderInApp: 'Zamów w aplikacji', orderInAppDesc: 'Dostawa do domu albo odbiór w Twoim sklepie', fillAddr: 'Uzupełnij adres dostawy',
    balance: 'Saldo wianków', collected: 'Zebrane łącznie', levelsInfo: 'Poziom zależy od wianków zebranych łącznie. Wymiana na nagrody nie obniża poziomu.',
    yourLevel: 'Twój poziom', unlocked: 'Odblokowany', locked: 'Brakuje', levelsTitle: 'Poziomy i przywileje', from: 'od', howEarn: 'Jak zbierać wianki?',
    earn1: '1 zł na paragonie = 1 wianek (po zeskanowaniu karty lub zamówieniu w aplikacji)', earn2: 'Wianek dnia: +5 codziennie, +50 za pełny tydzień', earn3: 'Wyzwania, kupony ×2 i bonusy za poziom',
    skip: 'Pomiń', next: 'Dalej', start: 'Zaczynamy',
    ob1k: 'Delikatesy wschodnie', ob1t: 'Smaki domu w Twojej kieszeni', ob1d: 'Ponad 160 produktów ze Wschodu, sklepy w 5 miastach i ceny, których nie ma przy kasie bez aplikacji.',
    ob2k: 'Karta przy kasie', ob2t: 'Pokaż kod — zbieraj wianki', ob2d: 'Każda złotówka to wianek. Kupony aktywujesz w aplikacji, kasjer zeskanuje je razem z kartą.',
    ob3k: 'Nagrody', ob3t: 'Wianki wymieniasz na prezenty', ob3d: 'Kwas, zefiry, kawa albo tort Miodownik — za darmo, za zebrane wianki.',
    login: 'Załóż kartę', name: 'Imię', phone: 'Numer telefonu', namePh: 'np. Olena', join: 'Odbierz 50 wianków na start', terms: 'Demo: dane zostają tylko na tym urządzeniu.',
    hello: 'Dzień dobry', helloEve: 'Dobry wieczór',
    nav_home: 'Start', nav_shop: 'Sklep', nav_card: 'Karta', nav_coupons: 'Kupony', nav_account: 'Konto',
    wianki: 'wianki', wiankiBal: 'Twoje wianki', more: 'Jeszcze', noCoupons: 'Aktywuj kupony przed zakupami', showCard: 'Karta', toNext: 'do poziomu', topLevel: 'Najwyższy poziom',
    daily: 'Wianek dnia', dailyDesc: 'Zrywaj kwiatek codziennie. 7 dni = pełny wianek i +50.', pick: 'Zerwij', picked: 'Jutro kolejny',
    yourCoupons: 'Kupony dla Ciebie', seeAll: 'Wszystkie', appPrices: 'Ceny z aplikacją', appPricesDesc: 'W zamówieniu z aplikacji i przy kasie z kartą',
    categories: 'Kategorie', nearest: 'Najbliższy sklep', allStores: 'Wszystkie sklepy',
    activate: 'Aktywuj', active: 'Aktywny', validTo: 'do',
    search: 'Szukaj: kwas, zefir, kawior…', all: 'Wszystko', onlyApp: 'Z aplikacją', noResults: 'Nic nie znaleźliśmy. Spróbuj innej nazwy.',
    addList: 'Na listę', inList: 'Na liście', outOfStock: 'Chwilowo brak online', inStores: 'Zapytaj w sklepie',
    withApp: 'z aplikacją', regular: 'bez aplikacji', save: 'oszczędzasz',
    list: 'Lista zakupów', listEmpty: 'Lista jest pusta', listEmptyDesc: 'Dodawaj produkty ze sklepu — w sklepie odhaczysz je jednym dotknięciem.', goShop: 'Przeglądaj produkty', clearDone: 'Usuń kupione', estimate: 'Szacunkowo',
    cardTitle: 'Twoja karta', cardHint: 'Pokaż kod kasjerowi przed zapłatą. To Twój stały numer karty, przypisany do numeru telefonu.', brightness: 'Ekran nie zgaśnie, dopóki karta jest otwarta',
    couponsOn: 'aktywne kupony', rewardsReady: 'nagrody do odbioru', cardNo: 'Nr karty', simulate: 'Symuluj skan przy kasie (demo)',
    scanned: 'Zakupy zaliczone!', earned: 'zdobyte wianki', saved: 'zaoszczędzone', total: 'Do zapłaty', done: 'Super',
    tab_coupons: 'Kupony', tab_rewards: 'Nagrody', tab_challenges: 'Wyzwania',
    couponsLead: 'Aktywuj przed zakupami — zadziałają same po zeskanowaniu karty.',
    rewardsLead: 'Wymień wianki na prezent. Odbierzesz go przy kasie, pokazując kartę.',
    challengesLead: 'Wykonaj zadanie, a bonusowe wianki trafią na konto.',
    redeem: 'Wymień', redeemed: 'Czeka przy kasie', notEnough: 'Brakuje', bonus: 'bonus',
    level: 'Poziom', perks: 'Twoje przywileje', receipts: 'E-paragony', noReceipts: 'Tu pojawią się Twoje paragony po pierwszym zakupie.',
    stores: 'Nasze sklepy', language: 'Język', logout: 'Wyloguj',
    open: 'Otwarte', closed: 'Zamknięte', closes: 'do', opens: 'otwarcie o', route: 'Trasa', call: 'Zadzwoń', flagship: 'Sklep główny',
    toast_on: 'Kupon aktywny — zadziała przy kasie', toast_off: 'Kupon wyłączony', toast_list: 'Dodano do listy', toast_daily: 'Kwiatek zerwany',
    toast_redeem: 'Nagroda czeka przy kasie', toast_ch: 'Wyzwanie ukończone',
    items: 'szt.', products: 'produktów', member: 'W rodzinie od', km: 'km',
  },
  uk: {
    brandSub: 'Східні делікатеси', searchHome: 'Що шукаєш сьогодні?', deliveryMode: 'Доставка', pickupMode: 'Самовивіз', deliveryToday: 'Доставка сьогодні', freeFrom: 'безкоштовно від 120 zł', pickupAt: 'Самовивіз:', readyIn: 'готово за ~1 год',
    firstTitle: '−20% на перше замовлення', firstDesc: 'До 30 zł дешевше. Застосується саме в кошику.', firstOrder: 'Перше замовлення −20%', orderNow: 'Замовити',
    flashKicker: 'Пропозиція дня', flashEnds: 'Закінчиться через', x2Title: '×2 віночки за замовлення', x2Desc: 'Кожне замовлення в застосунку рахується подвійно.', x2Note: '×2 у застосунку',
    reorder: 'Замовити знову', reorderAll: 'Додати все', bundles: 'Готові набори', bundlesDesc: '−10% за весь набір', addBundle: 'Додати набір', bundleDisc: 'Набір', toast_bundle: 'Набір у кошику', toast_reorder: 'Додано попереднє замовлення', goCart: 'Кошик', freeLeft: 'до безкоштовної доставки', freeDone: 'Безкоштовна доставка',

    yourStore: 'Твій магазин', chooseStore: 'Обери магазин', choose: 'Обрати', chosen: 'Твій магазин', chosenShort: 'Обрано', storesIn: 'магазинів у 8 містах', opensDay: 'відкриття',
    days: ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    cart: 'Кошик', toCart: 'У кошик', inCart: 'У кошику', cartEmpty: 'Кошик порожній', cartEmptyDesc: 'Додавай товари — замовиш доставку або забереш у своєму магазині.',
    toast_cart: 'Додано в кошик', subtotal: 'Товари', appSave: 'Ціни із застосунком', delivery: 'Доставка', free: 'Безкоштовно',
    toFree: 'До безкоштовної доставки бракує', freeOk: 'Доставка безкоштовна', howGet: 'Як отримаєш?', pickup: 'Самовивіз з магазину', pickupDesc: 'Готово приблизно за 1 год', courier: 'Доставка кур’єром', courierDesc: 'Сьогодні або завтра',
    street: 'Вулиця і номер', city: 'Місто', payment: 'Оплата', payBlik: 'BLIK', payCard: 'Картка', payCash: 'При отриманні', payDemo: 'Демо — жодна оплата не списується.',
    order: 'Замовити', orderDone: 'Замовлення прийнято!', orderNo: 'Замовлення', orders: 'Замовлення', noOrders: 'У тебе ще немає замовлень.',
    st_new: 'Прийнято', st_pack: 'Збираємо', st_ready: 'Готово до видачі', st_way: 'В дорозі', st_done: 'Доставлено',
    orderInApp: 'Замов у застосунку', orderInAppDesc: 'Доставка додому або самовивіз з твого магазину', fillAddr: 'Заповни адресу доставки',
    balance: 'Баланс віночків', collected: 'Зібрано загалом', levelsInfo: 'Рівень залежить від віночків, зібраних загалом. Обмін на нагороди рівень не знижує.',
    yourLevel: 'Твій рівень', unlocked: 'Відкрито', locked: 'Бракує', levelsTitle: 'Рівні та привілеї', from: 'від', howEarn: 'Як збирати віночки?',
    earn1: '1 zł у чеку = 1 віночок (після сканування картки або замовлення в застосунку)', earn2: 'Віночок дня: +5 щодня, +50 за повний тиждень', earn3: 'Завдання, купони ×2 та бонуси за рівень',
    skip: 'Пропустити', next: 'Далі', start: 'Почнімо',
    ob1k: 'Східні делікатеси', ob1t: 'Смак дому у твоїй кишені', ob1d: 'Понад 160 товарів зі Сходу, магазини в 5 містах і ціни, яких немає на касі без застосунку.',
    ob2k: 'Картка на касі', ob2t: 'Покажи код — збирай віночки', ob2d: 'Кожен злотий — це віночок. Купони активуєш у застосунку, касир зчитає їх разом із карткою.',
    ob3k: 'Нагороди', ob3t: 'Віночки міняєш на подарунки', ob3d: 'Квас, зефір, кава чи торт Медовик — безкоштовно, за зібрані віночки.',
    login: 'Створи картку', name: 'Ім’я', phone: 'Номер телефону', namePh: 'напр. Олена', join: 'Отримати 50 віночків на старт', terms: 'Демо: дані зберігаються лише на цьому пристрої.',
    hello: 'Добрий день', helloEve: 'Добрий вечір',
    nav_home: 'Головна', nav_shop: 'Товари', nav_card: 'Картка', nav_coupons: 'Купони', nav_account: 'Профіль',
    wianki: 'віночки', wiankiBal: 'Твої віночки', more: 'Ще', noCoupons: 'Активуй купони перед покупками', showCard: 'Картка', toNext: 'до рівня', topLevel: 'Найвищий рівень',
    daily: 'Віночок дня', dailyDesc: 'Зривай квітку щодня. 7 днів = повний вінок і +50.', pick: 'Зірвати', picked: 'Завтра наступна',
    yourCoupons: 'Купони для тебе', seeAll: 'Усі', appPrices: 'Ціни із застосунком', appPricesDesc: 'У замовленні із застосунку та на касі з карткою',
    categories: 'Категорії', nearest: 'Найближчий магазин', allStores: 'Усі магазини',
    activate: 'Активувати', active: 'Активний', validTo: 'до',
    search: 'Пошук: квас, зефір, ікра…', all: 'Усе', onlyApp: 'Із застосунком', noResults: 'Нічого не знайшли. Спробуй іншу назву.',
    addList: 'У список', inList: 'У списку', outOfStock: 'Тимчасово немає онлайн', inStores: 'Запитай у магазині',
    withApp: 'із застосунком', regular: 'без застосунку', save: 'економиш',
    list: 'Список покупок', listEmpty: 'Список порожній', listEmptyDesc: 'Додавай товари — у магазині відмітиш їх одним дотиком.', goShop: 'Переглянути товари', clearDone: 'Прибрати куплене', estimate: 'Орієнтовно',
    cardTitle: 'Твоя картка', cardHint: 'Покажи код касиру перед оплатою. Це твій постійний номер картки, прив’язаний до номера телефону.', brightness: 'Екран не згасне, поки картка відкрита',
    couponsOn: 'активні купони', rewardsReady: 'нагороди до отримання', cardNo: '№ картки', simulate: 'Симулювати сканування (демо)',
    scanned: 'Покупку зараховано!', earned: 'зароблені віночки', saved: 'зекономлено', total: 'До сплати', done: 'Супер',
    tab_coupons: 'Купони', tab_rewards: 'Нагороди', tab_challenges: 'Завдання',
    couponsLead: 'Активуй перед покупками — спрацюють самі після сканування картки.',
    rewardsLead: 'Обміняй віночки на подарунок. Отримаєш його на касі, показавши картку.',
    challengesLead: 'Виконай завдання — і бонусні віночки зарахуються на рахунок.',
    redeem: 'Обміняти', redeemed: 'Чекає на касі', notEnough: 'Бракує', bonus: 'бонус',
    level: 'Рівень', perks: 'Твої привілеї', receipts: 'Е-чеки', noReceipts: 'Тут з’являться твої чеки після першої покупки.',
    stores: 'Наші магазини', language: 'Мова', logout: 'Вийти',
    open: 'Відчинено', closed: 'Зачинено', closes: 'до', opens: 'відкриється о', route: 'Маршрут', call: 'Подзвонити', flagship: 'Головний магазин',
    toast_on: 'Купон активний — спрацює на касі', toast_off: 'Купон вимкнено', toast_list: 'Додано до списку', toast_daily: 'Квітку зірвано',
    toast_redeem: 'Нагорода чекає на касі', toast_ch: 'Завдання виконано',
    items: 'шт.', products: 'товарів', member: 'У родині з', km: 'км',
  },
};

// Gotowe zestawy (demo): −10% gdy wszystkie produkty zestawu są w koszyku.
window.BUNDLES = [
  { id: 'b-stol', items: [1979, 1554, 1597, 1504], pl: ['Słowiański stół', 'Kawior, szprotki, kwas i majonez'], uk: ['Слов’янський стіл', 'Ікра, шпроти, квас і майонез'] },
  { id: 'b-slodko', items: [2005, 1421, 1512, 1437], pl: ['Podwieczorek u babci', 'Miodownik, zefir, chałwa i kawa'], uk: ['Полуденок у бабусі', 'Медовик, зефір, халва і кава'] },
  { id: 'b-mecz', items: [1540, 1479, 1579, 1597], pl: ['Wieczór meczowy', 'Chipsy, grzanki, pestki i kwas'], uk: ['Футбольний вечір', 'Чипси, грінки, насіння і квас'] },
];
window.BUNDLE_DISC = 0.1;
window.FIRST_ORDER = { pct: 0.2, max: 30 };

/* BANERY NA GŁÓWNEJ — jeden szablon, sieć edytuje tylko te pola:
   theme:  'copper' | 'cornflower' | 'teal' | 'gold'   (kolor tła karty)
   product: id produktu (zdjęcie + cena brane z katalogu) albo 'flash' = okazja dnia
   img:    własne zdjęcie (ścieżka), gdy nie ma product
   kicker / title / desc: teksty PL i UK
   cta:    { pl, uk, to: '#/shop' } albo { add: true } = dodaj produkt do koszyka
   price:  true = pokaż cenę produktu, countdown: true = licznik do północy */
window.BANNERS = [
  { id: 'first', theme: 'copper', product: 1990, onlyFirstOrder: true,
    kicker: { pl: 'Tylko w aplikacji', uk: 'Лише в застосунку' },
    title: { pl: '−20% na pierwsze zamówienie', uk: '−20% на перше замовлення' },
    desc: { pl: 'Do 30 zł taniej. Naliczy się samo w koszyku.', uk: 'До 30 zł дешевше. Застосується саме в кошику.' },
    cta: { pl: 'Zamów teraz', uk: 'Замовити', to: '#/shop' } },
  { id: 'flash', theme: 'cornflower', product: 'flash', price: true, countdown: true,
    kicker: { pl: 'Okazja dnia · −30%', uk: 'Пропозиція дня · −30%' },
    cta: { pl: 'Do koszyka', uk: 'У кошик', add: true } },
  { id: 'x2', theme: 'teal', img: 'assets/c/kielbasa.webp',
    kicker: { pl: 'Tylko w aplikacji', uk: 'Лише в застосунку' },
    title: { pl: '×2 wianki za zamówienia', uk: '×2 віночки за замовлення' },
    desc: { pl: 'Każde zamówienie w aplikacji liczy się podwójnie.', uk: 'Кожне замовлення в застосунку рахується подвійно.' },
    cta: { pl: 'Zamów teraz', uk: 'Замовити', to: '#/shop' } },
];
