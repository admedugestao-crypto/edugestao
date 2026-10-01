package br.com.edugestao.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView webView = getBridge().getWebView();
                if (manager == null || webView == null) {
                    call.reject("O serviço de impressão não está disponível.");
                    return;
                }

                String title = "Recibo EduGestão";
                manager.print(
                    title,
                    webView.createPrintDocumentAdapter(title),
                    new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .build()
                );
                // Confirma apenas a abertura do serviço; salvar ou cancelar cabe ao usuário.
                call.resolve();
            } catch (Exception exception) {
                call.reject("Não foi possível abrir a impressão.", exception);
            }
        });
    }
}
