# CONTAIBLE

[Wasp](https://wasp.sh) ile geliştirilmiş, [Open Saas](https://opensaas.sh) şablonunu temel alır.

### Running locally
 - Projenin kök dizininde doğru geliştirme (dev) değerlerini içeren `.env.client` ve `.env.server` dosyalarının bulunduğundan emin olun.
 - Veritabanını `wasp start db` komutuyla başlatın ve açık bırakın.
 - `wasp start` komutunu çalıştırın ve açık bırakın.
 - [İSTEĞE BAĞLI]: Uygulamayı ilk kez başlatıyorsanız ayrıca `wasp db migrate-dev` komutunu çalıştırın.



### DEPLOY SÜRECİ

Wasp projesinin dökümanında ön yüz (React) ve arka yüz (Express) kodlarının ayrı ayrı deploy edilmesi öneriliyordu ancak bunun için birden fazla Web App kaynağı gerekiyordu. Çözüm için Wasp’ın derlediği ön yüz ve arka yüz çıktıları birleştirilerek tek bir zip halinde Web App‘e gönderildi. Projenin kök dizinine geçilerek yazılan komutlar;

### Genel Derleme (Wasp)
wasp build

### Önyüz (React) için Build
cd .wasp/build/web-app
REACT_APP_API_URL="https://docmentor-fbhdbkgpg0e0a4b6.germanywestcentral-01.azurewebsites.net/" npm run build

### Arkayüz (Node/Express) için Bundle
cd ../../../.wasp/build/server
npm run bundle

### Tek Dosyada Toplama
cd ../../..
cp -r .wasp/build/server/*  azure-test
cp -r .wasp/build/db  azure-test/db
cp -r .wasp/build/web-app/build  azure-test/web-build
