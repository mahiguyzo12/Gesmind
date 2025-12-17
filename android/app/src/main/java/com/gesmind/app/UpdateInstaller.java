package com.gesmind.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Environment;
import android.database.Cursor;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstaller extends Plugin {

    public void installFromUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url parameter is required");
            return;
        }

        Context context = getContext();
        try {
            DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            Uri uri = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "gesmind_update.apk");

            final long downloadId = dm.enqueue(request);

            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context ctx, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id != downloadId) return;

                    Uri apkUri = dm.getUriForDownloadedFile(downloadId);
                    if (apkUri == null) {
                        // try to resolve file path
                        Cursor c = dm.query(new DownloadManager.Query().setFilterById(downloadId));
                        if (c != null && c.moveToFirst()) {
                            int columnIndex = c.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                            String localUri = c.getString(columnIndex);
                            if (localUri != null) apkUri = Uri.parse(localUri);
                            c.close();
                        }
                    }

                    try {
                        Intent install = new Intent(Intent.ACTION_VIEW);
                        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
                        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(install);
                        call.resolve();
                    } catch (Exception e) {
                        call.reject("Failed to launch installer: " + e.getMessage());
                    }

                    try {
                        ctx.unregisterReceiver(this);
                    } catch (Exception ex) { }
                }
            };

            context.registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            // Resolve immediately with download id so caller can show progress if desired
            call.resolve();
        } catch (Exception e) {
            call.reject("Download failed: " + e.getMessage());
        }
    }
}
