# Ключ підпису (signing key) — Ситно

## Як створено ключ
Ключ згенеровано локально утилітою **keytool** з JDK (входить до Android Studio, `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`):

```
keytool -genkeypair -v -storetype PKCS12 ^
  -keystore keystore/sytno-release.jks ^
  -alias sytno ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -dname "CN=<Ім'я Прізвище>, O=<Організація>, L=<Місто>, C=UA"
```

| Параметр | Значення |
|---|---|
| Формат сховища | PKCS12 (`.jks`) |
| Alias | `sytno` |
| Алгоритм | RSA 2048 біт |
| Термін дії | 10 000 днів (~27 років) |
| Власник (DN) | `<заповнити з виводу keytool -list>` |
| SHA-1 | `<заповнити>` |
| SHA-256 | `<заповнити>` |

Відбитки сертифіката отримано командою:
```
keytool -list -v -keystore keystore/sytno-release.jks -alias sytno
```

## Як ключ використовується для збірки
Збірка виконується через **EAS Build** (Expo Application Services) з локальними обліковими даними:

- у `eas.json` для профілів `preview` і `production` вказано `"credentialsSource": "local"`;
- у корені проєкту лежить `credentials.json` зі шляхом до keystore, alias і паролями;
- команда збірки: `eas build -p android --profile preview` → підписаний APK.
  Для Google Play: `eas build -p android --profile production` → підписаний AAB.

Перевірка підпису готового APK:
```
apksigner verify --print-certs sytno.apk
```
SHA-256 сертифіката у виводі збігається з відбитком ключа вище.

## Безпека
Файл `.jks` і `credentials.json` не потрапляють у git (додані в `.gitignore`), паролі зберігаються окремо. Резервна копія ключа зберігається поза репозиторієм — без неї неможливо випускати оновлення застосунку з тим самим підписом (якщо не використовується Play App Signing).
