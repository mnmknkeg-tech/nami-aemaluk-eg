'use client';

import { useEffect, useState } from 'react';
import { Star, Loader2, MessageSquare, Send, User } from 'lucide-react';
import { apiPath, APP_SCOPE, getCsrfToken, getStoredAuthToken, isSessionActive } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Review {
  id: string;
  userName?: string;
  user?: { name?: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

interface ReviewsSectionProps {
  type: 'product' | 'shop';
  targetId: string;
}

export function ReviewsSection({ type, targetId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState('');

  const endpoint = type === 'product' ? `/products/${targetId}/reviews` : `/shops/${targetId}/reviews`;

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath(endpoint));
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [targetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!isSessionActive()) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(apiPath(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': APP_SCOPE,
          ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || 'فشل إرسال التقييم');
      }
      setComment('');
      setRating(5);
      setShowForm(false);
      await loadReviews();
    } catch (err: any) {
      setError(err?.message || 'فشل إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">التقييمات والمراجعات</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-bold text-sm text-amber-500">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-slate-500">({reviews.length})</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gradient text-white text-xs font-bold hover:shadow-glow-cyan transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          اكتب تقييمك
        </button>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">تقييمك</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1"
                >
                  <Star
                    className={`w-7 h-7 transition-all ${
                      s <= (hoverRating || rating)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">تعليقك</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-sm outline-none focus:border-brand-cyan transition-colors resize-none"
              placeholder="شاركنا رأيك في المنتج..."
            />
          </div>
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-brand-gradient text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'جاري الإرسال...' : 'إرسال'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-slate-500 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          جاري تحميل التقييمات...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-bold text-sm">لا توجد تقييمات بعد</p>
          <p className="text-slate-400 text-xs mt-1">كن أول من يقيّم!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const name = review.userName || review.user?.name || 'مستخدم';
            return (
              <div
                key={String(review.id)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{name}</span>
                      <span className="text-xs text-slate-400 font-semibold">{formatDate(review.createdAt)}</span>
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
