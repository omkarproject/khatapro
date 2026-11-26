package com.smartkhata.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {

    companion object {
        private const val APP_URL = "https://smartkhata.netsell.in"
    }

    private var webView: WebView? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var lastBackPressedTime = 0L

    private var isInitialLoad by mutableStateOf(true)
    private var loadProgress by mutableIntStateOf(0)
    private var hasNetworkError by mutableStateOf(false)

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = filePathCallback
        filePathCallback = null
        if (callback == null) return@registerForActivityResult

        var results: Array<Uri>? = null
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            if (data == null || (data.data == null && data.clipData == null)) {
                cameraPhotoUri?.let { results = arrayOf(it) }
            } else {
                val clipData = data.clipData
                if (clipData != null && clipData.itemCount > 0) {
                    results = Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                } else if (data.data != null) {
                    results = arrayOf(data.data!!)
                }
            }
        }
        callback.onReceiveValue(results)
        cameraPhotoUri = null
    }

    private val runtimePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val pending = pendingWebPermissionRequest
        pendingWebPermissionRequest = null
        if (pending != null) {
            val grantedResources = mutableListOf<String>()
            for (res in pending.resources) {
                when (res) {
                    PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                        if (grants[Manifest.permission.RECORD_AUDIO] == true ||
                            hasPermission(Manifest.permission.RECORD_AUDIO)
                        ) {
                            grantedResources.add(res)
                        }
                    }
                    PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                        if (grants[Manifest.permission.CAMERA] == true ||
                            hasPermission(Manifest.permission.CAMERA)
                        ) {
                            grantedResources.add(res)
                        }
                    }
                }
            }
            if (grantedResources.isNotEmpty()) {
                pending.grant(grantedResources.toTypedArray())
            } else {
                pending.deny()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestStartupPermissions()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val wv = webView
                if (wv != null && wv.canGoBack()) {
                    wv.goBack()
                } else {
                    val now = System.currentTimeMillis()
                    if (now - lastBackPressedTime < 2000) {
                        finish()
                    } else {
                        lastBackPressedTime = now
                        Toast.makeText(this@MainActivity, "Press back again to exit SmartKhata", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })

        setContent {
            MaterialTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0B0F19))
                        .windowInsetsPadding(WindowInsets.systemBars)
                ) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx -> createConfiguredWebView(ctx) }
                    )

                    if (loadProgress in 1..99 && !isInitialLoad) {
                        LinearProgressIndicator(
                            progress = { loadProgress / 100f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(2.5.dp)
                                .align(Alignment.TopCenter),
                            color = Color(0xFF4F46E5),
                            trackColor = Color.Transparent
                        )
                    }

                    if (isInitialLoad) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0xFF0B0F19)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.app_logo),
                                    contentDescription = "SmartKhata",
                                    modifier = Modifier
                                        .size(88.dp)
                                        .clip(RoundedCornerShape(22.dp))
                                )
                                Spacer(modifier = Modifier.height(18.dp))
                                Text(
                                    text = "SmartKhata",
                                    color = Color.White,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Cloud Ledger & Billing",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 12.sp
                                )
                                Spacer(modifier = Modifier.height(22.dp))
                                CircularProgressIndicator(
                                    modifier = Modifier.size(26.dp),
                                    color = Color(0xFF6366F1),
                                    strokeWidth = 2.5.dp
                                )
                            }
                        }
                    }

                    if (hasNetworkError) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0xFF0B0F19))
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.app_logo),
                                    contentDescription = "SmartKhata",
                                    modifier = Modifier
                                        .size(72.dp)
                                        .clip(RoundedCornerShape(18.dp))
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "Unable to connect",
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Please check your internet connection and tap Retry.",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 13.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                                Button(
                                    onClick = {
                                        hasNetworkError = false
                                        isInitialLoad = true
                                        webView?.reload()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                                ) {
                                    Text("Retry", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createConfiguredWebView(context: Context): WebView {
        val wv = WebView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(wv, true)

        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(true)
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = if (isNetworkAvailable()) WebSettings.LOAD_DEFAULT else WebSettings.LOAD_CACHE_ELSE_NETWORK
            // Remove "; wv)" marker so Google OAuth works inside the native app
            userAgentString = userAgentString.replace("; wv)", ")").replace("Version/4.0 ", "") + " SmartKhataAndroid/1.0"
        }

        wv.addJavascriptInterface(AndroidBridge(wv), "AndroidNativeBridge")

        wv.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            handleWebDownload(wv, url, userAgent, contentDisposition, mimeType)
        }

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val urlStr = uri.toString()
                val scheme = uri.scheme?.lowercase() ?: ""

                // Launch external apps for UPI, WhatsApp, Dialer, Email, Intent links
                if (scheme in listOf("upi", "tez", "phonepe", "paytmmp", "bhim", "whatsapp", "tel", "mailto", "sms", "intent") ||
                    urlStr.startsWith("https://wa.me/") ||
                    urlStr.startsWith("https://api.whatsapp.com/")
                ) {
                    return openExternalUri(urlStr)
                }

                // Keep SmartKhata, OAuth, Cashfree, and Razorpay inside the app WebView
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                hasNetworkError = false
                super.onPageStarted(view, url, favicon)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                isInitialLoad = false
                // Hook window.print() to Android's native PrintManager
                view?.evaluateJavascript(
                    """
                    (function(){
                      if (!window.__skAndroidPrintHooked && window.AndroidNativeBridge) {
                        window.__skAndroidPrintHooked = true;
                        window.print = function() { window.AndroidNativeBridge.printCurrentPage(); };
                      }
                    })();
                    """.trimIndent(),
                    null
                )
                super.onPageFinished(view, url)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true && !isNetworkAvailable()) {
                    isInitialLoad = false
                    hasNetworkError = true
                }
                super.onReceivedError(view, request, error)
            }
        }

        wv.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                loadProgress = newProgress
                if (newProgress >= 85) {
                    isInitialLoad = false
                }
                super.onProgressChanged(view, newProgress)
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                runOnUiThread {
                    val needed = mutableListOf<String>()
                    for (res in request.resources) {
                        if (res == PermissionRequest.RESOURCE_AUDIO_CAPTURE && !hasPermission(Manifest.permission.RECORD_AUDIO)) {
                            needed.add(Manifest.permission.RECORD_AUDIO)
                        }
                        if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE && !hasPermission(Manifest.permission.CAMERA)) {
                            needed.add(Manifest.permission.CAMERA)
                        }
                    }
                    if (needed.isEmpty()) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermissionRequest = request
                        runtimePermissionLauncher.launch(needed.toTypedArray())
                    }
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val acceptTypes = fileChooserParams?.acceptTypes?.filter { it.isNotBlank() }?.toTypedArray()
                val allowMultiple = fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE

                val contentIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = if (acceptTypes != null && acceptTypes.size == 1) acceptTypes[0] else "*/*"
                    if (acceptTypes != null && acceptTypes.size > 1) {
                        putExtra(Intent.EXTRA_MIME_TYPES, acceptTypes)
                    }
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple)
                }

                var cameraIntent: Intent? = null
                if (hasPermission(Manifest.permission.CAMERA)) {
                    try {
                        val photoFile = File.createTempFile("sk_cam_", ".jpg", cacheDir)
                        val photoUri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${packageName}.fileprovider",
                            photoFile
                        )
                        cameraPhotoUri = photoUri
                        cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                            putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                        }
                    } catch (_: Exception) {
                        cameraPhotoUri = null
                    }
                }

                val chooser = Intent(Intent.ACTION_CHOOSER).apply {
                    putExtra(Intent.EXTRA_INTENT, contentIntent)
                    putExtra(Intent.EXTRA_TITLE, "Select File or Take Photo")
                    if (cameraIntent != null) {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                    }
                }

                try {
                    fileChooserLauncher.launch(chooser)
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                val popupWebView = WebView(this@MainActivity)
                popupWebView.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(v: WebView?, req: WebResourceRequest?): Boolean {
                        val targetUrl = req?.url?.toString() ?: return false
                        if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
                            view?.loadUrl(targetUrl)
                        } else {
                            openExternalUri(targetUrl)
                        }
                        return true
                    }
                }
                transport.webView = popupWebView
                resultMsg.sendToTarget()
                return true
            }
        }

        webView = wv
        wv.loadUrl(APP_URL)
        return wv
    }

    private fun openExternalUri(urlStr: String): Boolean {
        return try {
            val intent = if (urlStr.startsWith("intent://")) {
                Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME)
            } else {
                Intent(Intent.ACTION_VIEW, Uri.parse(urlStr))
            }
            startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, "No compatible app found on this device.", Toast.LENGTH_SHORT).show()
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun handleWebDownload(
        wv: WebView,
        url: String,
        userAgent: String,
        contentDisposition: String,
        mimeType: String
    ) {
        val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            .ifBlank { "SmartKhata_${System.currentTimeMillis()}" }

        if (url.startsWith("blob:") || url.startsWith("data:")) {
            val safeName = fileName.replace("'", "")
            val safeMime = mimeType.ifBlank { "application/octet-stream" }.replace("'", "")
            wv.evaluateJavascript(
                """
                (function() {
                  fetch('$url').then(r => r.blob()).then(blob => {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                      if (window.AndroidNativeBridge && reader.result) {
                        window.AndroidNativeBridge.saveBase64File(reader.result, '$safeName', '$safeMime');
                      }
                    };
                    reader.readAsDataURL(blob);
                  }).catch(function(){});
                })();
                """.trimIndent(),
                null
            )
            return
        }

        try {
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType)
                addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                addRequestHeader("User-Agent", userAgent)
                setTitle(fileName)
                setDescription("Downloading from SmartKhata")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            }
            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(this, "Downloading $fileName...", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Download failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestStartupPermissions() {
        val perms = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
            perms.add(Manifest.permission.READ_MEDIA_IMAGES)
        } else {
            perms.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                perms.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }
        val missing = perms.filter { !hasPermission(it) }
        if (missing.isNotEmpty()) {
            runtimePermissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    override fun onDestroy() {
        webView?.let {
            it.stopLoading()
            it.destroy()
        }
        webView = null
        super.onDestroy()
    }

    inner class AndroidBridge(private val wv: WebView) {
        @JavascriptInterface
        fun saveBase64File(dataUrl: String, fileName: String, mimeType: String) {
            try {
                val base64Part = if (dataUrl.contains(",")) dataUrl.substringAfter(",") else dataUrl
                val bytes = Base64.decode(base64Part, Base64.DEFAULT)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                        put(MediaStore.Downloads.MIME_TYPE, mimeType)
                        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                    val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    if (uri != null) {
                        contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    }
                } else {
                    val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    if (!dir.exists()) dir.mkdirs()
                    FileOutputStream(File(dir, fileName)).use { it.write(bytes) }
                }

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Saved to Downloads: $fileName", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Save failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun printCurrentPage() {
            runOnUiThread {
                try {
                    val printManager = getSystemService(Context.PRINT_SERVICE) as PrintManager
                    val adapter = wv.createPrintDocumentAdapter("SmartKhata_Document")
                    printManager.print("SmartKhata Document", adapter, PrintAttributes.Builder().build())
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Print unavailable: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
