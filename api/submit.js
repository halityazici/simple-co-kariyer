const nodemailer = require('nodemailer');
const multer = require('multer');

// Multer ile dosyayı belleğe alıyoruz (sunucuda depolama izni olmadığı için)
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

            // Vercel Environment variables'dan okuma yapmalısınız!
            // Örnek: process.env.EMAIL_USER ve process.env.EMAIL_PASS
            
            // Lütfen bu alanı kendi kurumsal sunucu bilgileriniz ile özelleştirin.
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "mail.simplechocolate.com.tr", // Sunucu SMTP Host adresi
                port: process.env.SMTP_PORT || 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

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
                from: `"Simple Co Kariyer" <${process.env.EMAIL_USER}>`,
                to: "info@simplechocolate.com.tr", // Başvurunun gideceği adres
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
            await transporter.sendMail(mailOptions);
            return res.status(200).json({ success: true, message: 'Başvuru başarıyla alındı.' });

        } catch (error) {
            console.error('Mail Gönderim Hatası:', error);
            return res.status(500).json({ error: 'İşlem başarısız, mail gönderilemedi.' });
        }
    });
}
