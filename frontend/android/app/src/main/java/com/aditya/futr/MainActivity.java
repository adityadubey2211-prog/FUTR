
package com.aditya.futr;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int STEP_PERMISSION_CODE = 100;

    @Override
    public void onCreate(Bundle savedInstanceState) {

        // Register custom native Steps plugin
        registerPlugin(StepsPlugin.class);

        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

            if (checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
                    == PackageManager.PERMISSION_GRANTED) {

                startStepService();

            } else {
                requestPermissions(
                        new String[]{Manifest.permission.ACTIVITY_RECOGNITION},
                        STEP_PERMISSION_CODE
                );
            }

        } else {
            startStepService();
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults
    ) {
        super.onRequestPermissionsResult(
                requestCode, permissions, grantResults
        );

        if (requestCode == STEP_PERMISSION_CODE) {

            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {

                startStepService();

            } else {
                Log.e("FUTR_STEPS", "Activity recognition permission denied");
            }
        }
    }

    private void startStepService() {
        Intent serviceIntent = new Intent(this, StepTrackingService.class);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
}
