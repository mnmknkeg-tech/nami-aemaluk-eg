-- Reviews table: the reviews domain code (repository.go) expects this exact
-- shape — id, user_id, target_type, target_id, rating, comment, user_name.
CREATE TABLE IF NOT EXISTS reviews (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     text NOT NULL,
    target_type text NOT NULL CHECK (target_type IN ('product', 'shop')),
    target_id   text NOT NULL,
    rating      int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     text NOT NULL DEFAULT '',
    user_name   text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT NOW(),
    updated_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);

-- Keep shop.rating in sync with product/shop review averages.
