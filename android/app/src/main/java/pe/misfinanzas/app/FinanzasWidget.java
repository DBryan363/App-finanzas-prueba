package pe.misfinanzas.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

/** Widget de pantalla de inicio: balance del mes + accesos directos a "Gasto" e "Ingreso". */
public class FinanzasWidget extends AppWidgetProvider {

    static final String PREFS = "finanzas_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, construir(ctx));
    }

    static void actualizarTodos(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, FinanzasWidget.class));
        if (ids.length > 0) mgr.updateAppWidget(ids, construir(ctx));
    }

    private static RemoteViews construir(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_finanzas);

        String mes = p.getString("mes", "");
        v.setTextViewText(R.id.w_titulo, mes.isEmpty() ? "Balance del mes" : "Balance · " + mes);
        v.setTextViewText(R.id.w_balance, p.getString("balance", "Abre la app"));
        v.setTextViewText(R.id.w_ingresos, "↑ " + p.getString("ingresos", "—"));
        v.setTextViewText(R.id.w_gastos, "↓ " + p.getString("gastos", "—"));

        v.setOnClickPendingIntent(R.id.w_raiz, abrir(ctx, "misfinanzas://inicio", 10));
        v.setOnClickPendingIntent(R.id.w_btn_voz, abrir(ctx, "misfinanzas://voz", 13));
        v.setOnClickPendingIntent(R.id.w_btn_gasto, abrir(ctx, "misfinanzas://nuevo/gasto", 11));
        v.setOnClickPendingIntent(R.id.w_btn_ingreso, abrir(ctx, "misfinanzas://nuevo/ingreso", 12));
        return v;
    }

    private static PendingIntent abrir(Context ctx, String url, int codigo) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url), ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
