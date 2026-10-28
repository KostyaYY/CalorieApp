# Ключ підпису (signing key) — Ситно

## Як створено ключ
Ключ згенеровано локально 28.10.2026 утилітою **keytool** з JDK, що входить до Android Studio (`C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`):

```
keytool -genkeypair -v -storetype PKCS12 ^
  -keystore keystore\sytno-release.jks ^
  -alias sytno ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -dname "CN=Konstantin Yevchuk, L=Kyiv, C=UA"
```

## Параметри ключа
| Параметр | Значення |
|---|---|
| Файл | `sytno-release.jks` |
| Формат сховища | PKCS12 |
| Alias | `sytno` |
| Тип запису | PrivateKeyEntry |
| Алгоритм ключа | RSA, 2048 біт |
| Алгоритм підпису | SHA256withRSA |
| Власник (Owner) | CN=Konstantin Yevchuk, L=Kyiv, C=UA |
| Видавець (Issuer) | CN=Konstantin Yevchuk, L=Kyiv, C=UA (самопідписаний сертифікат) |
| Серійний номер | ac20343efadea00a |
| Дійсний | з 28.10.2026 до 15.03.2054 (10 000 днів) |
| SHA-1 | `7C:C8:63:47:C8:E2:75:C8:81:22:22:0E:74:BA:89:C5:22:93:7C:8D` |
| SHA-256 | `40:FD:C8:47:BC:AF:AB:C5:52:FB:C5:D9:94:4A:B4:49:24:4D:8C:9C:86:DC:07:0E:CB:2E:C7:DC:92:7B:BB:FD` |

Дані отримано командою:
```
keytool -list -v -keystore keystore\sytno-release.jks -alias sytno
```

## Як ключ використано для збірки
Збірку виконано через **EAS Build** (Expo Application Services) з локальними обліковими даними, тобто застосунок підписано саме цим ключем, а не ключем, згенерованим сервісом:

- у `eas.json` для профілів `preview` і `production` вказано `"credentialsSource": "local"`;
- у корені проєкту файл `credentials.json` містить шлях до keystore, alias і паролі;
- команда збірки APK: `eas build -p android --profile preview`;
- для публікації в Google Play: `eas build -p android --profile production` (AAB).

Перевірити підпис APK можна командою з Android SDK Build-Tools:
```
apksigner verify --print-certs sytno.apk
```
SHA-256 сертифіката у виводі збігається з відбитком, наведеним вище.

## Безпека
Файл `.jks` і `credentials.json` виключено з git (`.gitignore`), паролі зберігаються окремо від репозиторію. Резервна копія ключа зберігається поза проєктом: без неї неможливо випускати оновлення застосунку з тим самим підписом.
