package pe.misfinanzas.app;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Recibe desde la app web los totales del mes y refresca el widget. */
@CapacitorPlugin(name = "FinanzasWidget")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void actualizar(PluginCall call) {
        getContext().getSharedPreferences(FinanzasWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("mes", call.getString("mes", ""))
            .putString("balance", call.getString("balance", ""))
            .putString("ingresos", call.getString("ingresos", ""))
            .putString("gastos", call.getString("gastos", ""))
            .apply();
        FinanzasWidget.actualizarTodos(getContext());
        call.resolve();
    }
}
