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
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Dosya yüklenirken hata oluştu' });
        }

        try {
            const formData = req.body;
            const cvFile = req.file;

            const emailText = `
Yeni bir kariyer formu başvurusu alındı!

[KİŞİSEL BİLGİLER]
Ad: ${formData.ad}
Soyad: ${formData.soyad}
Aktif Çalışıyor mu: ${formData.aktif_calisiyor}
Bu İşten Önce Çalışıyor muydu: ${formData.once_calisiyor}

[İLETİŞİM BİLGİLERİ]
Ev Telefonu: ${formData.ev_tel || 'Girilmedi'}
Cep Telefonu: ${formData.cep_tel || 'Girilmedi'}
E-Posta: ${formData.eposta || 'Girilmedi'}

[KARİYER DETAYLARI]
Beklenen Maaş: ${formData.maas} TL
Çalışmak İstenilen Şube: ${formData.sube}
Başvuru Pozisyonu: ${formData.pozisyon}
Çalışma Şekli: ${formData.calisma}
Bizi Neden Seçti: ${formData.neden}

[CV LİNKİ (Eğer varsa)]: ${formData.cv_link || 'Eklenmedi'}
            `;

            let mailOptions = {
                // Resend üzerinde "Domain" ekleyene kadar test için 'onboarding@resend.dev' kullanmak zorundayız.
                // İleride kendi alan adınızı eklerseniz burayı 'ik@simplechocolate.com.tr' yapabilirsiniz!
                from: "Simple Co Kariyer <onboarding@resend.dev>",

                // Başvuruların gideceği mail adresi (Not: Domain doğrulanmadığı sürece bu adres, Resend'e kayıt olduğunuz mail adresi olmak ZORUNDADIR!)
                to: ["info@simplechocolate.com.tr"],

                subject: `Yeni İş Başvurusu: ${formData.ad} ${formData.soyad} - ${formData.pozisyon}`,
                text: emailText,
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
