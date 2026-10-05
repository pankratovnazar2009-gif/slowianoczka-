# Słowianoczka — aplikacja lojalnościowa (prototyp)

Prototyp aplikacji mobilnej (PWA) dla sieci sklepów **Słowianoczka — delikatesy wschodnie**: karta klienta przy kasie, kupony, wianki (punkty), nagrody, zamówienia z dostawą lub odbiorem w sklepie i mapa 16 sklepów.

Interfejs: polski i ukraiński. Działa w przeglądarce telefonu i można go „zainstalować” na ekranie głównym.

## Uruchomienie lokalne

```bash
npx http-server . -p 5173 -c-1
```

Następnie otwórz http://localhost:5173.

## Struktura

- `index.html` — powłoka aplikacji i ikony SVG
- `css/app.css` — wygląd (kolory z logo, tokeny w `:root`)
- `js/app.js` — logika ekranów
- `js/data.js` — **dane do edycji**: sklepy, kupony, nagrody, poziomy, zestawy, banery na stronie głównej, tłumaczenia
- `js/products.js` — katalog produktów (z API sklepu slowianoczka.pl)
- `assets/` — logo, ikony, zdjęcia produktów i kategorii

## Demo

Kupony, nagrody, ceny z aplikacją, zestawy i promocje są przykładowe. Dane klienta zapisują się tylko w telefonie. Płatności nie są pobierane. Docelowo potrzebny jest backend (konta, zamówienia) i integracja z kasami.
