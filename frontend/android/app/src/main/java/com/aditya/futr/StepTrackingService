
package com.aditya.futr;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.SharedPreferences;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class StepTrackingService extends Service implements SensorEventListener {

    private static final String TAG = "FUTR_STEPS";
    private static final String CHANNEL_ID = "FUTR_STEP_CHANNEL";
    private static final int NOTIFICATION_ID = 101;

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private SharedPreferences preferences;

    private float lastTotalSteps = -1;
    private float dailySteps = 0;
    private float baselineSteps = 0;

    private String currentDate;

    @Override
    public void onCreate() {
        super.onCreate();

        Log.d(TAG, "StepTrackingService created");

        preferences = getSharedPreferences("FUTR_STEPS", MODE_PRIVATE);

        currentDate = getTodayDate();

        String savedDate = preferences.getString("date", "");

        if (currentDate.equals(savedDate)) {
            dailySteps = preferences.getFloat("daily_steps", 0);
            baselineSteps = preferences.getFloat("baseline", 0);
            lastTotalSteps = preferences.getFloat("last_total_steps", -1);
        } else {
            dailySteps = 0;
            baselineSteps = 0;
            lastTotalSteps = -1;
            saveSteps();
        }

        createNotificationChannel();

        Notification notification = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("FUTR Step Tracking")
                .setContentText("Your steps are being tracked")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);

        if (stepSensor != null) {

            boolean registered = sensorManager.registerListener(
                    this,
                    stepSensor,
                    SensorManager.SENSOR_DELAY_NORMAL
            );

            Log.d(TAG, "Step sensor registration: " + registered);

        } else {
            Log.e(TAG, "Step counter sensor not available");
            stopSelf();
        }
    }

    private String getTodayDate() {
        return new SimpleDateFormat(
                "yyyy-MM-dd",
                Locale.getDefault()
        ).format(new Date());
    }

    private void saveSteps() {
        preferences.edit()
                .putString("date", currentDate)
                .putFloat("daily_steps", dailySteps)
                .putFloat("baseline", baselineSteps)
                .putFloat("last_total_steps", lastTotalSteps)
                .apply();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {

        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) {
            return;
        }

        float totalSteps = event.values[0];

        Log.d(TAG, "Sensor event received: " + totalSteps);

        String today = getTodayDate();

        // Reset daily count on a new day
        if (!today.equals(currentDate)) {

            currentDate = today;
            dailySteps = 0;
            baselineSteps = totalSteps;
            lastTotalSteps = totalSteps;

            saveSteps();

            Log.d(TAG, "New day started. Steps reset.");
            return;
        }

        // First sensor reading
        if (lastTotalSteps == -1) {

            baselineSteps = totalSteps - dailySteps;
            lastTotalSteps = totalSteps;

            saveSteps();

            Log.d(TAG, "Daily baseline initialized");
            Log.d(TAG, "Today's steps: " + dailySteps);
            return;
        }

        // Sensor counter reset
        if (totalSteps < lastTotalSteps) {

            baselineSteps = totalSteps;
            lastTotalSteps = totalSteps;

            saveSteps();

            Log.w(TAG, "Sensor counter reset detected");
            return;
        }

        // Calculate today's steps
        dailySteps = totalSteps - baselineSteps;
        lastTotalSteps = totalSteps;

        saveSteps();

        Log.d(TAG, "Today's steps: " + dailySteps);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "FUTR Step Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {

        Log.d(TAG, "StepTrackingService destroyed");

        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}