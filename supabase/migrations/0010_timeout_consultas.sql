-- 0010: margen de tiempo para las consultas de la app.
-- Supabase fija statement_timeout = 8 s para el rol `authenticated`. Los RPC
-- que resumen un escenario (`resumir_escenario`, `materializar_baseline`) y
-- las lecturas del panel con decenas de tiendas se acercan a ese límite bajo
-- carga (varias tiendas programándose a la vez). 15 s da margen sin dejar
-- consultas descontroladas.
alter role authenticated set statement_timeout = '15s';
