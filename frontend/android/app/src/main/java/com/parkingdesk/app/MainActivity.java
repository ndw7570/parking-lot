package com.parkingdesk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.parkingdesk.app.plate.PlateScannerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 앱 안에 있는(npm 패키지가 아닌) 플러그인은 직접 등록한다. super 전에 해야 브리지가 안다.
        registerPlugin(PlateScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
