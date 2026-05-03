import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, Plus, Trash2, Image as ImageIcon, Loader2, 
  Search, Filter, CheckCircle, X, UploadCloud, FileText
} from 'lucide-react';

const db = supabase as any;

export default function GalleryManager() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form for new image
  const [newImage, setNewImage] = useState({
    title: '',
    description: '',
    file: null as File | null,
    previewUrl: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      // Check if project has a project_id (linked to client_projects)
      if (selectedProject.project_id) {
        fetchGallery(selectedProject.project_id);
      } else {
        setGalleryItems([]);
      }
    } else {
      setGalleryItems([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await db.from('contracts').select('id, title, project_id, clients(name)').order('created_at', { ascending: false });
    if (data) setProjects(data);
  };

  const fetchGallery = async (projectId: string) => {
    setLoading(true);
    const { data } = await db.from('project_gallery').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (data) setGalleryItems(data);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage({
        ...newImage,
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedProject || !newImage.file || !newImage.title) {
      toast({ title: '⚠️ Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let projectId = selectedProject.project_id;

      // Se o contrato não tiver um project_id vinculado, criamos um registro em client_projects
      if (!projectId) {
        const { data: newProj, error: projErr } = await db.from('client_projects').insert({
          name: selectedProject.title,
          client_id: selectedProject.client_id || (await db.from('contracts').select('client_id').eq('id', selectedProject.id).single()).data?.client_id,
          status: 'producao'
        }).select('id').single();

        if (projErr) throw projErr;
        projectId = newProj.id;

        // Vincula o novo projeto ao contrato
        await db.from('contracts').update({ project_id: projectId }).eq('id', selectedProject.id);
        
        // Atualiza o estado local
        selectedProject.project_id = projectId;
      }

      const fileExt = newImage.file.name.split('.').pop();
      const fileName = `${projectId}/${Math.random()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, newImage.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await db.from('project_gallery').insert({
        project_id: projectId,
        title: newImage.title,
        description: newImage.description,
        image_url: publicUrl
      });

      if (dbError) throw dbError;

      toast({ title: '✅ Imagem enviada com sucesso!' });
      setNewImage({ title: '', description: '', file: null, previewUrl: '' });
      fetchGallery(projectId);
    } catch (error: any) {
      toast({ title: '❌ Erro ao enviar', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      // Extract path from URL
      const path = url.split('/public/documents/')[1];
      if (path) {
        await supabase.storage.from('documents').remove([path]);
      }

      const { error } = await db.from('project_gallery').delete().eq('id', id);
      if (error) throw error;

      toast({ title: '✅ Imagem excluída' });
      fetchGallery(selectedProject.project_id);
    } catch (error: any) {
      toast({ title: '❌ Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0a0a0a] text-white">
      <header>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
          <Camera className="w-8 h-8 text-amber-500" />
          Gerenciador de Galeria SD
        </h1>
        <p className="text-gray-400 mt-1 uppercase text-[10px] font-black tracking-widest">Atualize o cliente com fotos do andamento</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Project Selection */}
        <div className="space-y-6">
          <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl">
            <h3 className="font-bold text-amber-500 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Selecionar Projeto
            </h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                placeholder="Buscar projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
              {filteredProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border ${
                    selectedProject?.id === p.id 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <p className="font-black text-sm uppercase truncate">{p.title}</p>
                  <p className="text-[10px] opacity-60 truncate">{p.clients?.name || 'Cliente Geral'}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedProject && (
            <div className="bg-[#111111] border border-amber-500/20 rounded-[32px] p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-bold text-amber-500 mb-4 flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> Nova Atualização
              </h3>
              
              <div className="space-y-4">
                <div className="aspect-video bg-black/60 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-amber-500/40 transition-colors">
                  {newImage.previewUrl ? (
                    <img src={newImage.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-gray-500 uppercase">Clique para selecionar foto</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {newImage.previewUrl && (
                    <button 
                      onClick={() => setNewImage({ ...newImage, file: null, previewUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <input 
                  type="text"
                  placeholder="Título (Ex: Início da Marcenaria)"
                  value={newImage.title}
                  onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-500 outline-none"
                />

                <textarea 
                  placeholder="Descrição opcional..."
                  value={newImage.description}
                  onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-500 outline-none h-20 resize-none"
                />

                <button
                  onClick={handleUpload}
                  disabled={uploading || !newImage.file || !newImage.title}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Enviar para Galeria
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Gallery View */}
        <div className="lg:col-span-2">
          {!selectedProject ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/5 rounded-[40px]">
              <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-black uppercase tracking-tighter text-xl">Selecione um projeto para gerenciar</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                  Galeria: {selectedProject.title}
                </h2>
                <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full font-bold text-gray-400">
                  {galleryItems.length} itens
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {galleryItems.map(item => (
                    <div key={item.id} className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden group hover:border-amber-500/20 transition-all shadow-xl">
                      <div className="aspect-video relative overflow-hidden">
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-4 right-4">
                          <button 
                            onClick={() => handleDelete(item.id, item.image_url)}
                            className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="font-black text-white text-sm uppercase truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{item.description || 'Sem descrição'}</p>
                        <p className="text-[9px] text-amber-500/40 font-bold mt-4 uppercase">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {galleryItems.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[32px]">
                      <p className="text-gray-500 font-bold uppercase text-xs">Nenhuma foto enviada ainda</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
