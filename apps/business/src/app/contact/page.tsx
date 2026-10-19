import type { Metadata } from 'next';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'تواصل معنا',
  description: 'تواصل مع فريق نمّي أعمالك — نحن هنا لمساعدتك.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">تواصل معنا</h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            عندك سؤال؟ احنا هنا. تواصل معانا بأي طريقة تناسبك.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="mailto:support@mnmknk.com" className="bg-slate-50 rounded-[2rem] p-8 hover:bg-slate-100 transition-all">
              <Mail className="w-8 h-8 text-cyan-500 mb-4" />
              <h3 className="font-black text-slate-900 text-lg mb-1">البريد الإلكتروني</h3>
              <p className="text-slate-500">support@mnmknk.com</p>
            </a>
            <a href="tel:+20000000000" className="bg-slate-50 rounded-[2rem] p-8 hover:bg-slate-100 transition-all">
              <Phone className="w-8 h-8 text-cyan-500 mb-4" />
              <h3 className="font-black text-slate-900 text-lg mb-1">الهاتف</h3>
              <p className="text-slate-500">+20 00 000 0000</p>
            </a>
            <a href="https://wa.me/20000000000" className="bg-slate-50 rounded-[2rem] p-8 hover:bg-slate-100 transition-all">
              <MessageSquare className="w-8 h-8 text-cyan-500 mb-4" />
              <h3 className="font-black text-slate-900 text-lg mb-1">واتساب</h3>
              <p className="text-slate-500">تواصل مباشر عبر واتساب</p>
            </a>
            <div className="bg-slate-50 rounded-[2rem] p-8">
              <MapPin className="w-8 h-8 text-cyan-500 mb-4" />
              <h3 className="font-black text-slate-900 text-lg mb-1">العنوان</h3>
              <p className="text-slate-500">القاهرة، مصر</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
