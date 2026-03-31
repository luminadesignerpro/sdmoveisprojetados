import 'dart:math';
import 'package:flutter/material.dart';
import 'package:ar_flutter_plugin/ar_flutter_plugin.dart';
import 'package:ar_flutter_plugin/datatypes/config_planedetection.dart';
import 'package:ar_flutter_plugin/datatypes/node_types.dart';
import 'package:ar_flutter_plugin/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin/models/ar_anchor.dart';
import 'package:ar_flutter_plugin/models/ar_node.dart';
import 'package:vector_math/vector_math_64.dart' as math;

enum ARMode { measure, furniture, color }

class ARStudioWidget extends StatefulWidget {
  final Function(double totalBudget)? onBudgetUpdate;

  const ARStudioWidget({Key? key, this.onBudgetUpdate}) : super(key: key);

  @override
  _ARStudioWidgetState createState() => _ARStudioWidgetState();
}

class _ARStudioWidgetState extends State<ARStudioWidget> {
  // Configurações do Gerenciador AR
  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;

  // Modos de Aplicação e Lógica
  ARMode currentMode = ARMode.measure;
  String activeFurniture = 'sofa.glb'; // Modelo padrão para móveis
  Color activeWallColor = Colors.white;

  // Estados - Trena Profissional
  List<ARNode> measureNodes = [];
  String measureDistanceStr = "0 mm";

  // Estados - Móveis e Orçamento
  List<ARNode> furnitureNodes = [];
  double currentBudget = 0.0;

  @override
  void dispose() {
    super.dispose();
    arSessionManager?.dispose();
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
          showPlanes: true, // Crucial para travar em paredes/chão
          customPlaneTexturePath: "Images/triangle.png",
          showWorldOrigin: false,
          handleTaps: true,
        );
    this.arObjectManager!.onInitialize();

    this.arSessionManager!.onPlaneOrPointTap = onPlaneOrPointTapped;
  }

  Future<void> onPlaneOrPointTapped(List<ARHitTestResult> hitTestResults) async {
    if (hitTestResults.isEmpty) return;

    // Pega o ponto de contato tridimensional (World Space)
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
      // Limpar medição anterior
      for (var node in measureNodes) {
        arObjectManager!.removeNode(node);
      }
      measureNodes.clear();
      setState(() => measureDistanceStr = "0 mm");
    }

    // Cria nó (ponto indicador) na malha
    var newNode = ARNode(
      type: NodeType.webGLB,
      uri: "https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Sphere/glTF/Sphere.gltf", // Ponto simples
      scale: math.Vector3(0.05, 0.05, 0.05),
      position: math.Vector3(pose.getColumn(3).x, pose.getColumn(3).y, pose.getColumn(3).z),
    );

    await arObjectManager!.addNode(newNode);
    measureNodes.add(newNode);

    if (measureNodes.length == 2) {
      var p1 = measureNodes[0].position;
      var p2 = measureNodes[1].position;
      // Cálculo direto em 3D de distância EUCLIDEANA nativa do flutter!
      double distanceInMeters = p1.distanceTo(p2); 
      setState(() {
         // Transformando para milímetros (Trena Profissional Escala Real 1:1)
        measureDistanceStr = "${(distanceInMeters * 1000).toStringAsFixed(0)} mm";
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Medida fixada: \$measureDistanceStr')));
    }
  }

  Future<void> _handleFurnitureMode(math.Matrix4 pose) async {
    // Travamento de nó ancorado para evitar "flutuação" do móvel 3D
    var newNode = ARNode(
      type: NodeType.localGLTF2,
      uri: "assets/models/\$activeFurniture", // Caminho para seu modelo GLB/GLTF de Movel HD
      scale: math.Vector3(1.0, 1.0, 1.0),
      position: math.Vector3(pose.getColumn(3).x, pose.getColumn(3).y, pose.getColumn(3).z),
    );
    await arObjectManager!.addNode(newNode);
    furnitureNodes.add(newNode);

    // Orçamentista Integrado
    double itemPrice = activeFurniture.contains('sofa') ? 1500.0 : 800.0;
    _updateBudget(itemPrice);
  }

  Future<void> _handleWallColorMode(math.Matrix4 pose) async {
    // Altera a cor de uma malha detectada (Painel MDF mapeado na parede)
    var planeNode = ARNode(
      type: NodeType.webGLB,
      uri: "https://your_bucket/models/wall_panel.glb",
      scale: math.Vector3(1.0, 2.7, 0.05), // Painel fixo de 2.70m projetado na parede detectada
       position: math.Vector3(pose.getColumn(3).x, pose.getColumn(3).y, pose.getColumn(3).z),
    );
    await arObjectManager!.addNode(planeNode);
    // Nota: Mudar material exige manipulação avançada no ar_flutter_plugin ou blocos de shaders,
    // usamos instanciação de novos painéis em caso prático sem a licença completa da Unity.
    
    _updateBudget(250.0); // Preço da nova cor/revestimento
  }

  void _updateBudget(double value) {
    setState(() {
      currentBudget += value;
    });
    if (widget.onBudgetUpdate != null) {
      widget.onBudgetUpdate!(currentBudget);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Visão Nativa de AR da Câmera
          ARView(
            onARViewCreated: onARViewCreated,
            planeDetectionConfig: PlaneDetectionConfig.horizontalAndVertical,
          ),
          
          // HUD de Medição (Flutuante)
          if (measureNodes.length == 2)
            Positioned(
              top: MediaQuery.of(context).size.height / 2 - 50,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade600,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    measureDistanceStr,
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 24),
                  ),
                ),
              ),
            ),

          // Menu Superior de Orçamento
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                     Text('STUDIO AR PRO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                     Text('MDF & FERRAGENS', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 10)),
                  ],
                ),
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(15)),
                  child: Text(
                    'Total: R\$ \${currentBudget.toStringAsFixed(2)}',
                    style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold),
                  ),
                )
              ],
            ),
          ),

          // Menu Inferior (Trena, Móveis, Cor)
          Positioned(
            bottom: 30,
            left: 20,
            right: 20,
            child: Container(
               padding: EdgeInsets.all(10),
               decoration: BoxDecoration(color: Colors.black.withOpacity(0.8), borderRadius: BorderRadius.circular(25)),
               child: Row(
                 mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                 children: [
                   _buildMenuButton(Icons.straighten, 'Trena', ARMode.measure),
                   _buildMenuButton(Icons.chair, 'Móveis', ARMode.furniture),
                   _buildMenuButton(Icons.format_paint, 'Cor', ARMode.color),
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: isSelected ? Colors.amber : Colors.white54, size: 30),
          SizedBox(height: 5),
          Text(label, style: TextStyle(color: isSelected ? Colors.amber : Colors.white54, fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
