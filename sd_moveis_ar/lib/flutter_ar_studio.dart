import 'dart:io';
import 'package:flutter/material.dart';
import 'package:ar_flutter_plugin/ar_flutter_plugin.dart';
import 'package:ar_flutter_plugin/datatypes/config_planedetection.dart';
import 'package:ar_flutter_plugin/datatypes/node_types.dart';
import 'package:ar_flutter_plugin/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin/models/ar_node.dart';
import 'package:ar_flutter_plugin/models/ar_hittest_result.dart';
import 'package:vector_math/vector_math_64.dart' as math;
import 'package:model_viewer_plus/model_viewer_plus.dart';
import 'package:screenshot/screenshot.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

enum ARMode { measure, furniture, color }
enum MeasurementUnit { mm, cm, m }

class ARStudioWidget extends StatefulWidget {
  final Function(double totalBudget)? onBudgetUpdate;

  const ARStudioWidget({super.key, this.onBudgetUpdate});

  @override
  ARStudioWidgetState createState() => ARStudioWidgetState();
}

class ARStudioWidgetState extends State<ARStudioWidget> {
  final supabase = Supabase.instance.client;
  final ScreenshotController screenshotController = ScreenshotController();
  
  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;

  ARMode currentMode = ARMode.measure;
  bool isSaving = false;
  
  List<Map<String, dynamic>> clients = [];
  String? selectedClientId;
  String? selectedProjectId;

  MeasurementUnit activeUnit = MeasurementUnit.mm;
  
  final List<Map<String, dynamic>> furnitureLibrary = [
    {
      "name": "Armário MDF",
      "file": "https://modelviewer.dev/shared-assets/models/Cabinet.glb",
      "price": 1200.0,
      "icon": Icons.kitchen
    },
    {
      "name": "Mesa Central",
      "file": "https://modelviewer.dev/shared-assets/models/Woodland.glb",
      "price": 800.0,
      "icon": Icons.table_restaurant
    },
    {
      "name": "Cadeira Elite",
      "file": "https://modelviewer.dev/shared-assets/models/Chair.glb",
      "price": 250.0,
      "icon": Icons.chair_alt
    },
  ];
  int activeFurnitureIndex = 0;

  final List<Map<String, dynamic>> wallColors = [
    {"name": "Branco TX", "uri": "https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Box/glTF-Binary/Box.glb", "price": 100.0, "color": Colors.white},
    {"name": "Freijó Ouro", "uri": "https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Box/glTF-Binary/Box.glb", "price": 180.0, "color": Colors.brown},
    {"name": "Grafite Premium", "uri": "https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Box/glTF-Binary/Box.glb", "price": 150.0, "color": Colors.blueGrey},
  ];
  int activeColorIndex = 0;

  List<ARNode> measureNodes = [];
  String measureDistanceStr = "0 mm";
  double currentBudget = 0.0;

  @override
  void initState() {
    super.initState();
    _fetchClients();
  }

  Future<void> _fetchClients() async {
    try {
      final data = await supabase.from('clients').select('id, name, phone').order('name');
      setState(() {
        clients = List<Map<String, dynamic>>.from(data);
      });
    } catch (e) {
      debugPrint("Error fetching clients: $e");
    }
  }

  Future<void> _shareOnWhatsApp(String screenshotUrl) async {
    if (selectedClientId == null) return;
    
    final clientData = clients.firstWhere((c) => c['id'].toString() == selectedClientId);
    final phone = clientData['phone'] ?? "";
    final name = clientData['name'] ?? "Cliente";
    
    if (phone.isEmpty) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Cliente sem telefone cadastrado!")));
       return;
    }

    // Clean phone number (keep only digits)
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    final whatsappHost = cleanPhone.startsWith('55') ? cleanPhone : '55$cleanPhone';

    final message = """
Olá *${name}*, aqui está o seu projeto da *SD Móveis Projetados* em Realidade Aumentada! 🏠✨

📏 *Medidas:* $measureDistanceStr
💰 *Orçamento Estimado:* R\$ ${currentBudget.toStringAsFixed(2)}
🖼️ *Visualização 3D:* $screenshotUrl

O que achou do projeto? Podemos prosseguir com o pedido?
""";

    final url = "https://wa.me/$whatsappHost?text=${Uri.encodeComponent(message)}";
    
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Não foi possível abrir o WhatsApp")));
    }
  }

  Future<void> _saveProject() async {
    if (selectedClientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Selecione um cliente primeiro!"), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => isSaving = true);

    try {
      // 1. Capture Screenshot
      final image = await screenshotController.capture();
      String? screenshotUrl;

      if (image != null) {
          final tempDir = await getTemporaryDirectory();
          final file = await File('${tempDir.path}/ar_screenshot_${DateTime.now().millisecondsSinceEpoch}.png').create();
          await file.writeAsBytes(image);

          // Upload to Supabase Storage
          final fileName = 'ar_${DateTime.now().millisecondsSinceEpoch}.png';
          await supabase.storage.from('ar-screenshots').upload(fileName, file);
          screenshotUrl = supabase.storage.from('ar-screenshots').getPublicUrl(fileName);
      }

      // 2. Prepare Data
      final projectData = {
        "measurements": measureNodes.length == 2 ? measureDistanceStr : "0",
        "items": furnitureLibrary.where((item) => true).toList(), // In a real app, track placed items
        "timestamp": DateTime.now().toIso8601String(),
      };

      // 3. Save to Database
      await supabase.from('ar_measurements').insert({
        'client_id': selectedClientId,
        'title': 'Projeto AR - ${DateTime.now().toString().substring(0, 16)}',
        'data': projectData,
        'total_value': currentBudget,
        'screenshot_url': screenshotUrl,
      });

      if (!mounted) return;
      
      // Dialog to offer WhatsApp sharing
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: Colors.black87,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.amber.withOpacity(0.5))),
          title: const Text("🚀 Projeto Sincronizado!", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("O projeto AR foi salvo no banco de dados e a imagem foi enviada para a nuvem.", style: TextStyle(color: Colors.white70)),
              const SizedBox(height: 10),
              Text("Total: R\$ ${currentBudget.toStringAsFixed(2)}", style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Depois", style: TextStyle(color: Colors.white38)),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                _shareOnWhatsApp(screenshotUrl ?? "");
              },
              icon: const Icon(Icons.send, color: Colors.black),
              label: const Text("ENVIAR WHATSAPP", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.greenAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            )
          ],
        ),
      );
    } catch (e) {
      debugPrint("Error saving project: $e");
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erro ao salvar: $e"), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => isSaving = false);
    }
  }

  @override
  void dispose() {
    arSessionManager?.dispose();
    super.dispose();
  }

  void onARViewCreated(
    ARSessionManager arSessionManager,
    ARObjectManager arObjectManager,
    ARAnchorManager arAnchorManager,
    ARLocationManager arLocationManager,
  ) {
    this.arSessionManager = arSessionManager;
    this.arObjectManager = arObjectManager;
    this.arAnchorManager = arAnchorManager;

    this.arSessionManager!.onInitialize(
          showFeaturePoints: false,
          showPlanes: true, 
          customPlaneTexturePath: "Images/triangle.png",
          showWorldOrigin: false,
          handleTaps: true,
        );
    this.arObjectManager!.onInitialize();

    this.arSessionManager!.onPlaneOrPointTap = onPlaneOrPointTapped;
  }

  Future<void> onPlaneOrPointTapped(List<ARHitTestResult> hitTestResults) async {
    if (hitTestResults.isEmpty) return;

    var singleHitTestResult = hitTestResults.first;
    var pose = singleHitTestResult.worldTransform;

    if (currentMode == ARMode.measure) {
      await _handleMeasureMode(pose);
    } else if (currentMode == ARMode.furniture) {
      await _handleFurnitureMode(pose);
    } else if (currentMode == ARMode.color) {
      await _handleWallColorMode(pose);
    }
  }

  Future<void> _handleMeasureMode(math.Matrix4 pose) async {
    if (measureNodes.length >= 2) {
      for (var node in measureNodes) {
        arObjectManager!.removeNode(node);
      }
      measureNodes.clear();
      setState(() => measureDistanceStr = "0 mm");
    }

    var newNode = ARNode(
      type: NodeType.webGLB,
      uri: "https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Sphere/glTF/Sphere.gltf", 
      scale: math.Vector3(0.04, 0.04, 0.04),
      position: math.Vector3(pose.getColumn(3).x, pose.getColumn(3).y, pose.getColumn(3).z),
    );

    await arObjectManager!.addNode(newNode);
    measureNodes.add(newNode);

    if (measureNodes.length == 2) {
      var p1 = measureNodes[0].position;
      var p2 = measureNodes[1].position;
      double distanceInMeters = p1.distanceTo(p2); 
      _updateMeasureString(distanceInMeters);
      _updateBudget(0.0);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Nova metragem exportada: $measureDistanceStr!'),
        backgroundColor: Colors.green.shade800,
      ));
    }
  }

  void _updateMeasureString(double meters) {
    setState(() {
      if (activeUnit == MeasurementUnit.mm) {
        measureDistanceStr = "${(meters * 1000).toStringAsFixed(0)} mm";
      } else if (activeUnit == MeasurementUnit.cm) {
        measureDistanceStr = "${(meters * 100).toStringAsFixed(1)} cm";
      } else {
        measureDistanceStr = "${meters.toStringAsFixed(2)} m";
      }
    });
  }

  void _toggleUnit() {
    setState(() {
      if (activeUnit == MeasurementUnit.mm) activeUnit = MeasurementUnit.cm;
      else if (activeUnit == MeasurementUnit.cm) activeUnit = MeasurementUnit.m;
      else activeUnit = MeasurementUnit.mm;
      
      if (measureNodes.length == 2) {
         _updateMeasureString(measureNodes[0].position.distanceTo(measureNodes[1].position));
      }
    });
  }

  Future<void> _handleFurnitureMode(math.Matrix4 pose) async {
    var activeItem = furnitureLibrary[activeFurnitureIndex];
    var newNode = ARNode(
      type: NodeType.webGLB,
      uri: activeItem["file"],
      scale: math.Vector3(0.5, 0.5, 0.5),
      position: math.Vector3(pose.getColumn(3).x, pose.getColumn(3).y, pose.getColumn(3).z),
    );
    await arObjectManager!.addNode(newNode);
    
    _updateBudget(activeItem["price"]);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Móvel inserido: ${activeItem["name"]} | R\$ ${activeItem["price"]}')));
  }

  Future<void> _handleWallColorMode(math.Matrix4 pose) async {
    var activeItem = wallColors[activeColorIndex];
    var planeNode = ARNode(
      type: NodeType.webGLB,
      uri: activeItem["uri"],
      scale: math.Vector3(1.0, 2.7, 0.05),
       position: math.Vector3(pose.getColumn(3).x, pose.getColumn(3).y, pose.getColumn(3).z),
    );
    await arObjectManager!.addNode(planeNode);
    
    _updateBudget(activeItem["price"]);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Revestimento aplicado: ${activeItem["name"]} | R\$ ${activeItem["price"]}')));
  }

  void _updateBudget(double value) {
    setState(() {
      currentBudget += value;
    });
    if (widget.onBudgetUpdate != null) {
      widget.onBudgetUpdate!(currentBudget);
    }
  }

  void _show3DPreview(String modelUri, String title) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Colors.black87,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text("Visualizador 3D: $title", style: const TextStyle(color: Colors.white, fontSize: 16)),
          content: Container(
            height: 350,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white10,
              borderRadius: BorderRadius.circular(15),
            ),
            child: ModelViewer(
              backgroundColor: Colors.transparent,
              src: modelUri,
              alt: "Visualização 3D do móvel selecionado",
              autoRotate: true,
              cameraControls: true,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Fechar", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
            )
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Screenshot(
            controller: screenshotController,
            child: ARView(
              onARViewCreated: onARViewCreated,
              planeDetectionConfig: PlaneDetectionConfig.horizontalAndVertical,
            ),
          ),
          
          if (measureNodes.length == 2)
            Positioned(
              top: MediaQuery.of(context).size.height / 2 - 20,
              left: 40,
              right: 40,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade600,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: const [
                      BoxShadow(color: Colors.black54, blurRadius: 10, offset: Offset(0, 5))
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: _toggleUnit,
                        child: const Icon(Icons.architecture, color: Colors.black, size: 28)
                      ),
                      const SizedBox(width: 10),
                      Text(
                        measureDistanceStr,
                        style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 26, letterSpacing: 1.2),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                         Text('STUDIO AR PRO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18, shadows: [Shadow(color: Colors.black, blurRadius: 10)])),
                         Text('Medidas & Orçamento Vivo', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 10)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black87, 
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: Colors.greenAccent.withAlpha(128))
                      ),
                      child: Text(
                        'Total: R\$ ${currentBudget.toStringAsFixed(2)}',
                        style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.w900, fontSize: 13),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Colors.redAccent, size: 30),
                    )
                  ],
                ),
                const SizedBox(height: 15),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 15),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedClientId,
                      dropdownColor: Colors.black87,
                      hint: const Text("Selecione o Cliente", style: TextStyle(color: Colors.white70, fontSize: 12)),
                      isExpanded: true,
                      items: clients.map((client) {
                        return DropdownMenuItem<String>(
                          value: client['id'].toString(),
                          child: Text(client['name'], style: const TextStyle(color: Colors.white, fontSize: 13)),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => selectedClientId = val),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          if (isSaving)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.amber),
                    SizedBox(height: 15),
                    Text("Sincronizando com a nuvem...", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),

          if (currentMode == ARMode.furniture)
            Positioned(
              bottom: 120, left: 0, right: 0,
              child: SizedBox(
                height: 110,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: furnitureLibrary.length,
                  itemBuilder: (context, index) {
                    var item = furnitureLibrary[index];
                    bool isSelected = index == activeFurnitureIndex;
                    return GestureDetector(
                      onTap: () => setState(() => activeFurnitureIndex = index),
                      child: Container(
                        width: 130,
                        margin: const EdgeInsets.symmetric(horizontal: 10),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.amber : Colors.black87,
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(color: isSelected ? Colors.amberAccent : Colors.white24, width: 2),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                Icon(item["icon"], color: isSelected ? Colors.black : Colors.white70, size: 30),
                                InkWell(
                                  onTap: () => _show3DPreview(item["file"], item["name"]),
                                  child: Icon(Icons.remove_red_eye_rounded, color: isSelected ? Colors.black54 : Colors.amber, size: 24),
                                )
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(item["name"], textAlign: TextAlign.center, style: TextStyle(color: isSelected ? Colors.black : Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

          if (currentMode == ARMode.color)
            Positioned(
              bottom: 120, left: 0, right: 0,
              child: SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: wallColors.length,
                  itemBuilder: (context, index) {
                    var item = wallColors[index];
                    bool isSelected = index == activeColorIndex;
                    return GestureDetector(
                      onTap: () => setState(() => activeColorIndex = index),
                      child: Container(
                        margin: const EdgeInsets.only(right: 15),
                        width: 60,
                        decoration: BoxDecoration(
                          color: item["color"],
                          shape: BoxShape.circle,
                          border: Border.all(color: isSelected ? Colors.amber : Colors.white24, width: isSelected ? 4 : 1),
                          boxShadow: [
                            if (isSelected) BoxShadow(color: Colors.amber.withAlpha(128), blurRadius: 10, spreadRadius: 2)
                          ]
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

          Positioned(
            bottom: 30, left: 20, right: 20,
            child: Container(
               padding: const EdgeInsets.all(15),
               decoration: BoxDecoration(
                color: Colors.black.withAlpha(242), 
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: Colors.white10)
               ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildMenuButton(Icons.architecture, 'Trena', ARMode.measure),
                    _buildMenuButton(Icons.chair, 'Móveis 3D', ARMode.furniture),
                    _buildMenuButton(Icons.format_paint, 'Revestimento', ARMode.color),
                    const VerticalDivider(color: Colors.white24, indent: 5, endIndent: 5),
                    GestureDetector(
                      onTap: _saveProject,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.cloud_upload_rounded, color: selectedClientId != null ? Colors.greenAccent : Colors.white24, size: 30),
                          const SizedBox(height: 5),
                          Text('Salvar', style: TextStyle(color: selectedClientId != null ? Colors.greenAccent : Colors.white24, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMenuButton(IconData icon, String label, ARMode mode) {
    bool isSelected = currentMode == mode;
    return GestureDetector(
      onTap: () => setState(() => currentMode = mode),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white10 : Colors.transparent,
          borderRadius: BorderRadius.circular(15)
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isSelected ? Colors.amber : Colors.white54, size: 30),
            const SizedBox(height: 5),
            Text(label, style: TextStyle(color: isSelected ? Colors.amber : Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
