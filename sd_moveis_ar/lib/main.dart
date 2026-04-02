import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'flutter_ar_studio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'https://nglwscakhhdhelhbqkyb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdzY2FiaGhkaGVsaGJxa3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDYzNjgsImV4cCI6MjA4NzEyMjM2OH0.MidIwMPLT17szfNnG9VRTnisoPzDAFnEw7IVLpqJj6A',
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SD Móveis - AR Profissional',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.amber,
        scaffoldBackgroundColor: Colors.black,
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  double totalBudget = 0.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SD Móveis AR', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
        backgroundColor: Colors.amber,
        centerTitle: true,
        actions: [
          if (totalBudget > 0)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(10)),
                  child: Text("R\$ ${totalBudget.toStringAsFixed(2)}", style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                ),
              ),
            )
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.view_in_ar, size: 80, color: Colors.amber),
            const SizedBox(height: 20),
            const Text(
              'Bem-vindo ao Studio AR Elite',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 10),
            const Text(
              'Tire medidas e simule móveis em milímetros.',
              style: TextStyle(color: Colors.white70),
            ),
            if (totalBudget > 0) ...[
               const SizedBox(height: 20),
               Text(
                 'Orçamento Atual: R\$ ${totalBudget.toStringAsFixed(2)}',
                 style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 18),
               ),
            ],
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: () async {
                if (kIsWeb) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("AR Studio Profissional precisa de Android/iOS (Web não suportado)")),
                  );
                  return;
                }
                final double? result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ARStudioWidget()),
                );
                
                if (result != null) {
                   setState(() {
                      totalBudget = result;
                   });
                }
              },
              icon: const Icon(Icons.camera_alt, color: Colors.black),
              label: const Text('ABRIR CÂMERA 3D', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber,
                padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
