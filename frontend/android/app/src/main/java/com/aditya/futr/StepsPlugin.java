
package com.aditya.futr;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(name = "Steps")
public class StepsPlugin extends Plugin {

    @PluginMethod
    public void getTodaySteps(PluginCall call) {

        Log.d("FUTR_STEPS", "getTodaySteps() CALLED");
        Log.d("FUTR_STEPS", "Plugin method execution started successfully");

        try {
            SharedPreferences preferences =
                    getContext().getSharedPreferences(
                            "FUTR_STEPS",
                            Context.MODE_PRIVATE
                    );

            String today = new SimpleDateFormat(
                    "yyyy-MM-dd",
                    Locale.getDefault()
            ).format(new Date());

            String savedDate = preferences.getString("date", "");

            float savedSteps =
                    preferences.getFloat("daily_steps", 0);

            int steps = 0;

            if (today.equals(savedDate)) {
                steps = Math.round(savedSteps);
            }

            JSObject result = new JSObject();
            result.put("steps", steps);
            result.put("date", today);

            Log.d("FUTR_STEPS",
                    "Saved date: " + savedDate);

            Log.d("FUTR_STEPS",
                    "Sending steps to React: " + steps);

            call.resolve(result);

        } catch (Exception e) {

            Log.e("FUTR_STEPS",
                    "Error fetching steps", e);

            call.reject("Unable to fetch today's steps", e);
        }
    }
}
