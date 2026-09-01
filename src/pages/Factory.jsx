import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FactoryProjectList } from '@/components/factory/FactoryProjectList';
import { FactorySeedPanel } from '@/components/factory/FactorySeedPanel';
import { FactoryLogoGallery } from '@/components/factory/FactoryLogoGallery';
import { FactoryBrandPack } from '@/components/factory/FactoryBrandPack';
import { FactoryWebsitePreview } from '@/components/factory/FactoryWebsitePreview';
import { FactoryContentList } from '@/components/factory/FactoryContentList';
import { FactorySocialAI } from '@/components/factory/FactorySocialAI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Factory, Sparkles } from 'lucide-react';

export default function FactoryPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batchMode, setBatchMode] = useState(false);

  const loadProjects = async () => {
    try {
      const list = await base44.entities.FactoryProject.list('-created_date', 50);
      setProjects(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    const unsub = base44.entities.FactoryProject.subscribe(() => loadProjects());
    return unsub;
  }, []);

  const handleProjectCreated = async (project) => {
    if (project?.id) {
      setSelectedProject(project);
    } else if (project?.project_id) {
      const full = await base44.entities.FactoryProject.get(project.project_id);
      setSelectedProject(full);
    }
    loadProjects();
  };

  const handleProjectUpdated = () => {
    loadProjects();
    if (selectedProject?.id) {
      base44.entities.FactoryProject.get(selectedProject.id).then(setSelectedProject);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading">Website Factory</h1>
            <p className="text-sm text-muted-foreground">Autonomous website + brand + social content generation pipeline</p>
          </div>
        </div>
        <Button
          variant={batchMode ? 'default' : 'outline'}
          onClick={() => setBatchMode(!batchMode)}
        >
          <Sparkles className="w-4 h-4" />
          {batchMode ? 'Exit Batch Mode' : 'Batch Mode'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Project List Sidebar */}
        <FactoryProjectList
          projects={projects}
          selectedId={selectedProject?.id}
          onSelect={setSelectedProject}
        />

        {/* Main Panel */}
        <div className="space-y-6">
          {!selectedProject ? (
            <FactorySeedPanel onCreated={handleProjectCreated} />
          ) : (
            <>
              {/* Stage 1: Seed */}
              <FactorySeedPanel
                project={selectedProject}
                onUpdated={handleProjectUpdated}
              />

              {/* Stage 2: Research */}
              {selectedProject.competitor_research && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Industry Research</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedProject.competitor_research.competitors?.map((c, i) => (
                      <div key={i} className="border-l-2 border-primary pl-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.url}</p>
                        <p className="text-sm"><span className="text-green-600">Strength:</span> {c.strengths}</p>
                        <p className="text-sm"><span className="text-red-600">Weakness:</span> {c.weaknesses}</p>
                        <p className="text-sm"><span className="text-blue-600">Gap:</span> {c.gap}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-sm font-medium mb-1">Viral Hooks:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {selectedProject.competitor_research.viral_hooks?.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stage 3: Logos */}
              {selectedProject.logos?.length > 0 && (
                <FactoryLogoGallery
                  project={selectedProject}
                  onUpdated={handleProjectUpdated}
                />
              )}

              {/* Stage 4: Brand Pack */}
              {selectedProject.brand_pack && (
                <FactoryBrandPack
                  project={selectedProject}
                  onUpdated={handleProjectUpdated}
                />
              )}

              {/* Stage 5: Website Config */}
              {selectedProject.website_config && (
                <FactoryWebsitePreview
                  project={selectedProject}
                  onUpdated={handleProjectUpdated}
                />
              )}

              {/* Stage 6: Viral Content */}
              {selectedProject.viral_content?.length > 0 && (
                <FactoryContentList
                  project={selectedProject}
                  onUpdated={handleProjectUpdated}
                />
              )}

              {/* Stage 7: Social AI */}
              {selectedProject.viral_content?.length > 0 && (
                <FactorySocialAI
                  project={selectedProject}
                  onUpdated={handleProjectUpdated}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}