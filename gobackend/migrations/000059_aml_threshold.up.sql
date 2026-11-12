-- AML: function to check merchant 24h transaction volume
CREATE OR REPLACE FUNCTION check_merchant_24h_volume(p_shop_id TEXT, p_threshold DECIMAL DEFAULT 100000)
RETURNS TABLE(total_volume DECIMAL, exceeded BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(o.total), 0)::DECIMAL AS total_volume,
        COALESCE(SUM(o.total), 0) > p_threshold AS exceeded
    FROM orders o
    JOIN shops s ON s.id = o.shop_id
    WHERE s.id = p_shop_id
      AND o.created_at >= NOW() - INTERVAL '24 hours'
      AND o.status NOT IN ('cancelled', 'refunded');
END;
$$ LANGUAGE plpgsql STABLE;