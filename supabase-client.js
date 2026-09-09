(function() {
    const config = window.KAPDA_SUPABASE_CONFIG;

    if (!config || !config.url || !config.publishableKey || !window.supabase) {
        window.kapdaSupabase = null;
        return;
    }

    window.kapdaSupabase = window.supabase.createClient(
        config.url,
        config.publishableKey
    );
})();
