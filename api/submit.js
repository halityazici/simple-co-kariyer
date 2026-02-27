const { Resend } = require('resend');
const multer = require('multer');

// Resend API anahtarı Vercel ortam (environment) değişkenlerinden alınır.
// Vercel paneline "RESEND_API_KEY" adıyla eklenmelidir!
const resend = new Resend(process.env.RESEND_API_KEY);

// Multer ile dosyayı belleğe alıyoruz
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // max 5 MB
}).single('cv_file');

// Vercel body-parser devre dışı bırakılır çünkü multer okuyacak
export const config = {
    api: {
        bodyParser: false,
    },
};

export default function handler(req, res) {
    // CORS Başlıklarını (Headers) Ayarlama (İkas veya Local test için gerekli)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }


    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Dosya yüklenirken hata oluştu' });
        }

        try {
            const formDataRaw = req.body;
            const cvFile = req.file;

            // XSS (Cross-Site Scripting) Koruması için temel sanitize fonksiyonu
            const escapeHtml = (unsafe) => {
                if (typeof unsafe !== 'string') return unsafe;
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };

            // Form içindeki tüm metin verilerini HTML etiketlerinden (Zararlı kodlardan) arındırma
            const formData = {};
            for (const key in formDataRaw) {
                formData[key] = escapeHtml(formDataRaw[key] || '');
            }

            const emailHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8F6F0; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(78, 52, 46, 0.08);">
                    
                    <!-- Header -->
                    <div style="background-color: #4E342E; color: #ffffff; text-align: center; padding: 35px 20px;">
                        <h1 style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 1.5px;">YENİ İŞ BAŞVURUSU</h1>
                        <p style="margin: 12px 0 0 0; font-size: 16px; opacity: 0.85; font-weight: 300;">${formData.ad} ${formData.soyad} <span style="margin:0 10px;">|</span> ${formData.pozisyon}</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 40px;">
                        <h2 style="color: #4E342E; font-size: 18px; border-bottom: 2px solid #F0ECE1; padding-bottom: 10px; margin-top: 0;">1. Kişisel ve İletişim Bilgileri</h2>
                        <table style="width: 100%; margin-bottom: 35px; font-size: 15px; color: #444444; border-collapse: separate; border-spacing: 0 8px;">
                            <tr><td style="width: 40%; color: #8D6E63; font-weight: 500;">Ad Soyad:</td><td style="font-weight: 600; color: #3E2723;">${formData.ad} ${formData.soyad}</td></tr>
                            <tr><td style="color: #8D6E63; font-weight: 500;">Cep Telefonu:</td><td style="font-weight: 600; color: #3E2723;">${formData.cep_tel || 'Girilmedi'}</td></tr>
                            <tr><td style="color: #8D6E63; font-weight: 500;">Ev Telefonu:</td><td style="font-weight: 600; color: #3E2723;">${formData.ev_tel || 'Girilmedi'}</td></tr>
                            <tr><td style="color: #8D6E63; font-weight: 500;">E-Posta:</td><td style="font-weight: 600; color: #3E2723;">${formData.eposta || 'Girilmedi'}</td></tr>
                        </table>

                        <h2 style="color: #4E342E; font-size: 18px; border-bottom: 2px solid #F0ECE1; padding-bottom: 10px;">2. İş Beklentisi ve Detaylar</h2>
                        <table style="width: 100%; margin-bottom: 35px; font-size: 15px; color: #444444; border-collapse: separate; border-spacing: 0 8px;">
                            <tr><td style="width: 40%; color: #8D6E63; font-weight: 500;">Pozisyon:</td><td style="font-weight: 600; color: #3E2723;">${formData.pozisyon}</td></tr>
                            <tr><td style="color: #8D6E63; font-weight: 500;">İstenen Şube:</td><td style="font-weight: 600; color: #3E2723;">${formData.sube}</td></tr>
                            <tr><td style="color: #8D6E63; font-weight: 500;">Çalışma Şekli:</td><td style="font-weight: 600; color: #3E2723;">${formData.calisma}</td></tr>
                            <tr><td style="color: #8D6E63; font-weight: 500;">Beklenen Maaş:</td><td style="font-weight: 600; color: #3E2723;">${formData.maas} TL</td></tr>
                            <tr><td colspan="2" style="padding-top: 10px;">
                                <div style="background-color: #FDFBF7; border-left: 4px solid #D7CCC8; padding: 12px 15px; font-style: italic; color: #5D4037; border-radius: 0 6px 6px 0;">
                                    <span style="display:block; font-size:13px; color:#A1887F; margin-bottom:4px; font-style:normal;">Bizi neden seçti?</span>
                                    "${formData.neden}"
                                </div>
                            </td></tr>
                            ${formData.cv_link ? `<tr><td style="color: #8D6E63; font-weight: 500; padding-top: 10px;">Online CV Linki:</td><td style="font-weight: 600; padding-top: 10px;"><a href="${formData.cv_link}" style="color: #6D4C41; text-decoration: underline;">Tıklayıp Görüntüle</a></td></tr>` : ''}
                        </table>

                        <h2 style="color: #4E342E; font-size: 18px; border-bottom: 2px solid #F0ECE1; padding-bottom: 10px;">3. İş Geçmişi Durumu</h2>
                        
                        <!-- Aktif Çalışıyor Mu? -->
                        <div style="background-color: #FDFBF7; border: 1px solid #EFEBE9; padding: 20px; border-radius: 10px; font-size: 14.5px; color: #4E342E; margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size:15px;">Aktif Çalışıyor mu?</strong> 
                                <span style="background-color: #3E2723; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display:inline-block;">${formData.aktif_calisiyor.toUpperCase()}</span>
                            </div>
                            
                            ${formData.aktif_calisiyor === 'evet' ? `
                            <div style="margin-top: 15px; border-top: 1px dashed #D7CCC8; padding-top: 15px; line-height: 1.7;">
                                <table style="width: 100%; font-size:14px;">
                                    <tr><td style="width:30%; color:#8D6E63;">İş Yeri:</td><td style="font-weight:500;">${formData.m_is_yeri}</td></tr>
                                    <tr><td style="color:#8D6E63;">Ünvan:</td><td style="font-weight:500;">${formData.m_unvan}</td></tr>
                                    <tr><td style="color:#8D6E63;">Başlama:</td><td style="font-weight:500;">${formData.m_baslama}</td></tr>
                                    <tr><td style="color:#8D6E63;">Telefon:</td><td style="font-weight:500;">${formData.m_telefon}</td></tr>
                                    <tr><td style="color:#8D6E63;">Adres:</td><td style="font-weight:500;">${formData.m_adres}</td></tr>
                                </table>
                            </div>` : ''}
                            ${formData.aktif_calisiyor === 'diger' ? `<div style="margin-top: 15px; border-top: 1px dashed #D7CCC8; padding-top: 15px; color:#5D4037;"><b>Açıklama:</b> ${formData.m_diger_aciklama}</div>` : ''}
                        </div>

                        <!-- Daha Önce Çalıştı Mı? -->
                        <div style="background-color: #FDFBF7; border: 1px solid #EFEBE9; padding: 20px; border-radius: 10px; font-size: 14.5px; color: #4E342E;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size:15px;">Daha Önce Çalıştı mı?</strong> 
                                <span style="background-color: #3E2723; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display:inline-block;">${formData.once_calisiyor.toUpperCase()}</span>
                            </div>
                            
                            ${formData.once_calisiyor === 'evet' ? `
                            <div style="margin-top: 15px; border-top: 1px dashed #D7CCC8; padding-top: 15px; line-height: 1.7;">
                                <table style="width: 100%; font-size:14px;">
                                    <tr><td style="width:30%; color:#8D6E63;">İş Yeri:</td><td style="font-weight:500;">${formData.o_is_yeri}</td></tr>
                                    <tr><td style="color:#8D6E63;">Ünvan:</td><td style="font-weight:500;">${formData.o_unvan}</td></tr>
                                    <tr><td style="color:#8D6E63;">Tarihler:</td><td style="font-weight:500;">${formData.o_tarihler}</td></tr>
                                    <tr><td style="color:#8D6E63;">Telefon:</td><td style="font-weight:500;">${formData.o_telefon}</td></tr>
                                    <tr><td style="color:#8D6E63;">Adres:</td><td style="font-weight:500;">${formData.o_adres}</td></tr>
                                </table>
                            </div>` : ''}
                            ${formData.once_calisiyor === 'diger' ? `<div style="margin-top: 15px; border-top: 1px dashed #D7CCC8; padding-top: 15px; color:#5D4037;"><b>Açıklama:</b> ${formData.o_diger_aciklama}</div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #EFEBE9; text-align: center; padding: 25px; font-size: 13px; color: #795548; border-top: 1px solid #D7CCC8;">
                        <p style="margin: 0; line-height: 1.6;">Bu e-posta <b>Simple Co Kariyer Sistemi</b> tarafından otomatik oluşturulmuştur.<br>Adayın yüklediği Özgeçmiş/CV dosyası e-postanın ekinde yer almaktadır.</p>
                    </div>

                </div>
            </div>
            `;

            const emailTextFallback = `Yeni İş Başvurusu: ${formData.ad} ${formData.soyad} - Form detaylarını görebilmek için lütfen HTML destekleyen bir posta istemcisi kullanınız.`;

            let mailOptions = {
                // Resend üzerinde "Domain" ekleyene kadar test için 'onboarding@resend.dev' kullanmak zorundayız.
                from: "Simple Co Kariyer <onboarding@resend.dev>",

                // Başvuruların gideceği mail adresi
                to: ["info@simplechocolate.com.tr"],

                subject: `💼 Yeni Başvuru: ${formData.ad} ${formData.soyad} - ${formData.pozisyon}`,
                text: emailTextFallback,
                html: emailHtml,
            };

            // CV Dosyası yüklendiyse e-postaya ekle
            if (cvFile) {
                mailOptions.attachments = [
                    {
                        filename: cvFile.originalname,
                        content: cvFile.buffer
                    }
                ];
            }

            // Maili Gönder
            const { data, error } = await resend.emails.send(mailOptions);

            if (error) {
                console.error('Mail Gönderim Hatası:', error);
                return res.status(400).json({ error: 'İşlem başarısız.', details: error });
            }

            return res.status(200).json({ success: true, message: 'Başvuru başarıyla alındı.', data });

        } catch (error) {
            console.error('Bilinmeyen Hata:', error);
            return res.status(500).json({ error: 'Sunucu hatası, işlem yapılamadı.' });
        }
    });
}
