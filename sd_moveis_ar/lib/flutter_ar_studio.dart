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

enum ARMode { measure, furniture, color }

class ARStudioWidget extends StatefulWidget {
  final Function(double totalBudget)? onBudgetUpdate;

  const ARStudioWidget({super.key, this.onBudgetUpdate});

  @override
  ARStudioWidgetState createState() => ARStudioWidgetState();
}

class ARStudioWidgetState extends State<ARStudioWidget> {
  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;

  ARMode currentMode = ARMode.measure;
  
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
      setState(() {
        measureDistanceStr = "${(distanceInMeters * 1000).toStringAsFixed(0)} mm";
      });
      _updateBudget(0.0);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Nova metragem exportada: $measureDistanceStr!'),
        backgroundColor: Colors.green.shade800,
      ));
    }
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
          ARView(
            onARViewCreated: onARViewCreated,
            planeDetectionConfig: PlaneDetectionConfig.horizontalAndVertical,
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
                      const Icon(Icons.architecture, color: Colors.black, size: 28),
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
            child: Row(
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
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black87, 
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: Colors.greenAccent.withAlpha(128))
                  ),
                  child: Text(
                    'Total: R$ ${currentBudget.toStringAsFixed(2)}',
                    style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.w900, fontSize: 15),
                  ),
                ),
                IconButton(
                  onPressed: () {
                    Navigator.pop(context, currentBudget);
                  },
                  icon: const Icon(Icons.check_circle, color: Colors.greenAccent, size: 35),
                )
              ],
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
