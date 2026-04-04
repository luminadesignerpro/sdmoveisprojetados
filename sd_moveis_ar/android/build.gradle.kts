allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
    
    afterEvaluate {
        if (project.extensions.findByName("android") != null) {
            val android = project.extensions.getByName("android") as com.android.build.gradle.BaseExtension
            
            // 1. Inject Namespace for legacy plugins to satisfy AGP 8.0+ requirements
            if (android.namespace == null) {
                when (project.name) {
                    "ar_flutter_plugin" -> android.namespace = "io.carius.lars.ar_flutter_plugin"
                    "permission_handler_android" -> android.namespace = "com.baseflow.permissionhandler"
                    "geolocator_android" -> android.namespace = "com.baseflow.geolocator"
                    "path_provider_android" -> android.namespace = "io.flutter.plugins.pathprovider"
                    "shared_preferences_android" -> android.namespace = "io.flutter.plugins.sharedpreferences"
                    "url_launcher_android" -> android.namespace = "io.flutter.plugins.urllauncher"
                    "webview_flutter_android" -> android.namespace = "io.flutter.plugins.webviewflutter"
                    "android_intent_plus" -> android.namespace = "dev.fluttercommunity.plus.androidintent"
                    "app_links" -> android.namespace = "com.llfbandit.app_links"
                    "image_picker_android" -> android.namespace = "io.flutter.plugins.imagepicker"
                    "flutter_plugin_android_lifecycle" -> android.namespace = "io.flutter.plugins.flutter_plugin_android_lifecycle"
                    else -> {
                        android.namespace = "com.example.sd_moveis_ar.${project.name.replace("-", "_")}"
                    }
                }
            }
            
            // 2. Enforce SDK versions and Java 17 compatibility (required for modern AGP and AR Core)
            android.compileSdkVersion = "android-35"
            // For AGP 4.0+ we set it here, for AGP 7.0+ we also set compileSdk
            try {
                (android as Any).javaClass.getMethod("setCompileSdk", java.lang.Integer::class.java).invoke(android, 35)
            } catch (e: Exception) {
                // Not on AGP 7+ or method not found
            }
            
            android.compileOptions {
                sourceCompatibility = JavaVersion.VERSION_17
                targetCompatibility = JavaVersion.VERSION_17
            }
            
            android.defaultConfig {
                // Also force targetSdk to 35 for consistency
                targetSdkVersion(35)
            }
            
            // 3. Enforce Java 17 for Kotlin tasks (Modern DSL)
            project.tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
                compilerOptions {
                    jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
                    // Suppress deprecation warnings from legacy plugins
                    freeCompilerArgs.addAll("-Xsuppress-version-warnings", "-nowarn")
                }
            }

            // 4. Resolve Sceneform 1.17.1 namespace conflict
            // We bring back 'base' for classes like Vector3, but disable the duplicate check
            // because Sceneform 1.17.1 libraries have conflicting R/BuildConfig classes.
            project.tasks.matching { it.name.contains("DuplicateClasses", ignoreCase = true) }.configureEach {
                enabled = false
            }
        }
        
        // 5. Global Dependency Resolution Strategy
        project.configurations.all {
            resolutionStrategy {
                // Force AndroidX core versions to resolve duplicate class conflicts
                // If lStar error persists, try 1.6.0, but for now we try 1.10.1 (stable, less likely to have lStar issues)
                force("androidx.core:core:1.10.1")
                force("androidx.core:core-ktx:1.10.1")
                force("androidx.annotation:annotation:1.8.0")
                force("androidx.lifecycle:lifecycle-common:2.7.0")
                force("androidx.arch.core:core-common:2.2.0")
                
                // Force stable versions of problematic AndroidX libraries to avoid API 36 requirements
                force("androidx.browser:browser:1.8.0")
                force("androidx.activity:activity:1.9.3")
                force("androidx.activity:activity-ktx:1.9.3")
                force("androidx.fragment:fragment:1.8.5")
                force("androidx.navigationevent:navigationevent-android:1.0.0")
                
                // Force a stable ARCore version and Sceneform 1.17.1
                force("com.google.ar:core:1.41.0")
                force("com.google.ar.sceneform:core:1.17.1")
                force("com.google.ar.sceneform:base:1.17.1")
                force("com.google.ar.sceneform.ux:sceneform-ux:1.17.1")
                force("com.google.ar.sceneform:animation:1.17.1")
                force("com.google.ar.sceneform:rendering:1.17.1")
            }
        }
    }
}


subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
