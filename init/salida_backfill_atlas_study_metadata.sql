-- Backfill de authors/journal/abstract para 6 Study reales.
-- Generado por scripts/backfill_atlas_study_metadata.py.

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.hcp.glasser_2016', 'Glasser MF, Coalson TS, Robinson EC, et al. (2016). A multi-modal parcellation of human cerebral cortex. Nature, 536(7615), 171-178.', '10.1038/nature18933', 2016,
  ARRAY['Matthew F. Glasser', 'Timothy S. Coalson', 'Emma C. Robinson', 'Carl D. Hacker', 'John Harwell', 'Essa Yacoub', 'Kamil Ugurbil', 'Jesper Andersson', 'Christian F. Beckmann', 'Mark Jenkinson', 'Stephen M. Smith', 'David C. Van Essen'], 'Nature', 'Understanding the amazingly complex human cerebral cortex requires a map (or parcellation) of its major subdivisions, known as cortical areas. Making an accurate areal map has been a century-old objective in neuroscience. Using multi-modal magnetic resonance images from the Human Connectome Project (HCP) and an objective semi-automated neuroanatomical approach, we delineated 180 areas per hemisphere bounded by sharp changes in cortical architecture, function, connectivity, and/or topography in a precisely aligned group average of 210 healthy young adults. We characterized 97 new areas and 83 areas previously reported using post-mortem microscopy or other specialized study-specific approaches. To enable automated delineation and identification of these areas in new HCP subjects and in future studies, we trained a machine-learning classifier to recognize the multi-modal ''fingerprint'' of each cortical area. This classifier detected the presence of 96.6% of the cortical areas in new subjects, replicated the group parcellation, and could correctly locate areas in individuals with atypical parcellations. The freely available parcellation and classifier will enable substantially improved neuroanatomical precision for studies of the structural and functional organization of human cerebral cortex and its variation across individuals and in development, aging, and disease.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.brainnetome.fan_2016', 'Fan L, Li H, Zhuo J, et al. (2016). The Human Brainnetome Atlas: A New Brain Atlas Based on Connectional Architecture. Cerebral Cortex, 26(8), 3508-3526.', '10.1093/cercor/bhw157', 2016,
  ARRAY['Lingzhong Fan', 'Hai Li', 'Junjie Zhuo', 'Yu Zhang', 'Jiaojian Wang', 'Liangfu Chen', 'Zhengyi Yang', 'Congying Chu', 'Sangma Xie', 'Angela R. Laird', 'Peter T. Fox', 'Simon B. Eickhoff', 'Chunshui Yu', 'Tianzi Jiang'], 'Cerebral Cortex', 'The human brain atlases that allow correlating brain anatomy with psychological and cognitive functions are in transition from ex vivo histology-based printed atlases to digital brain maps providing multimodal in vivo information. Many current human brain atlases cover only specific structures, lack fine-grained parcellations, and fail to provide functionally important connectivity information. Using noninvasive multimodal neuroimaging techniques, we designed a connectivity-based parcellation framework that identifies the subdivisions of the entire human brain, revealing the in vivo connectivity architecture. The resulting human Brainnetome Atlas, with 210 cortical and 36 subcortical subregions, provides a fine-grained, cross-validated atlas and contains information on both anatomical and functional connections. Additionally, we further mapped the delineated structures to mental processes by reference to the BrainMap database. It thus provides an objective and stable starting point from which to explore the complex relationships between structure, connectivity, and function, and eventually improves understanding of how the human brain works. The human Brainnetome Atlas will be made freely available for download at http://atlas.brainnetome.org, so that whole brain parcellations, connections, and functional data will be readily available for researchers to use in their investigations into healthy and pathological states.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.gordon333.gordon_2016', 'Gordon EM, Laumann TO, Adeyemo B, Huckins JF, Kelley WM, Petersen SE (2016). Generation and Evaluation of a Cortical Area Parcellation from Resting-State Correlations. Cerebral Cortex, 26(1), 288-303.', '10.1093/cercor/bhu239', 2016,
  ARRAY['Evan M. Gordon', 'Timothy O. Laumann', 'Babatunde Adeyemo', 'Jeremy F. Huckins', 'William M. Kelley', 'Steven E. Petersen'], 'Cerebral Cortex', 'The cortical surface is organized into a large number of cortical areas; however, these areas have not been comprehensively mapped in the human. Abrupt transitions in resting-state functional connectivity (RSFC) patterns can noninvasively identify locations of putative borders between cortical areas (RSFC-boundary mapping; Cohen et al. 2008). Here we describe a technique for using RSFC-boundary maps to define parcels that represent putative cortical areas. These parcels had highly homogenous RSFC patterns, indicating that they contained one unique RSFC signal; furthermore, the parcels were much more homogenous than a null model matched for parcel size when tested in two separate datasets. Several alternative parcellation schemes were tested this way, and no other parcellation was as homogenous as or had as large a difference compared with its null model. The boundary map-derived parcellation contained parcels that overlapped with architectonic mapping of areas 17, 2, 3, and 4. These parcels had a network structure similar to the known network structure of the brain, and their connectivity patterns were reliable across individual subjects. These observations suggest that RSFC-boundary map-derived parcels provide information about the location and extent of human cortical areas. A parcellation generated using this method is available at http://www.nil.wustl.edu/labs/petersen/Resources.html.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.hcp.glasser_2013', 'Glasser MF, Sotiropoulos SN, Wilson JA, Coalson TS, Fischl B, Andersson JL, Xu J, Jbabdi S, Webster M, Polimeni JR, Van Essen DC, Jenkinson M (2013). The minimal preprocessing pipelines for the Human Connectome Project. NeuroImage, 80, 105-124.', '10.1016/j.neuroimage.2013.04.127', 2013,
  ARRAY['Matthew F. Glasser', 'Stamatios N. Sotiropoulos', 'J. Anthony Wilson', 'Timothy S. Coalson', 'Bruce Fischl', 'Jesper L. Andersson', 'Junqian Xu', 'Saad Jbabdi', 'Matthew Webster', 'Jonathan R. Polimeni', 'David C. Van Essen', 'Mark Jenkinson'], 'NeuroImage', 'The Human Connectome Project (HCP) faces the challenging task of bringing multiple magnetic resonance imaging (MRI) modalities together in a common automated preprocessing framework across a large cohort of subjects. The MRI data acquired by the HCP differ in many ways from data acquired on conventional 3 Tesla scanners and often require newly developed preprocessing methods. We describe the minimal preprocessing pipelines for structural, functional, and diffusion MRI that were developed by the HCP to accomplish many low level tasks, including spatial artifact/distortion removal, surface generation, cross-modal registration, and alignment to standard space. These pipelines are specially designed to capitalize on the high quality data offered by the HCP. The final standard space makes use of a recently introduced CIFTI file format and the associated grayordinate spatial coordinate system. This allows for combined cortical surface and subcortical volume analyses while reducing the storage and processing requirements for high spatial and temporal resolution data. Here, we provide the minimum image acquisition requirements for the HCP minimal preprocessing pipelines and additional advice for investigators interested in replicating the HCP''s acquisition protocols or using these pipelines. Finally, we discuss some potential future improvements to the pipelines.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.yeh2022.yeh_2022', 'Yeh FC (2022). Population-based tract-to-region connectome of the human brain and its hierarchical topology. Nature Communications, 13, 4933.', '10.1038/s41467-022-32595-4', 2022,
  ARRAY['Fang-Cheng Yeh'], 'Nature Communications', 'Connectome maps region-to-region connectivities but does not inform which white matter pathways form the connections. Here we constructed a population-based tract-to-region connectome to fill this information gap. The constructed connectome quantifies the population probability of a white matter tract innervating a cortical region. The results show that ~85% of the tract-to-region connectome entries are consistent across individuals, whereas the remaining (~15%) have substantial individual differences requiring individualized mapping. Further hierarchical clustering on cortical regions revealed dorsal, ventral, and limbic networks based on the tract-to-region connective patterns. The clustering results on white matter bundles revealed the categorization of fiber bundle systems in the association pathways. This tract-to-region connectome provides insights into the connective topology between cortical regions and white matter bundles. The derived hierarchical relation further offers a categorization of gray and white matter structures.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.rosen-halgren2021.rosen_halgren_2021', 'Rosen BQ, Halgren E (2021). A Whole-Cortex Probabilistic Diffusion Tractography Connectome. eNeuro, 8(1), ENEURO.0416-20.2020.', '10.1523/ENEURO.0416-20.2020', 2021,
  ARRAY['Burke Q. Rosen', 'Eric Halgren'], 'eNeuro', 'The WU-Minn Human Connectome Project (HCP) is a publicly-available dataset containing state-of-the-art structural magnetic resonance imaging (MRI), functional MRI (fMRI), and diffusion MRI (dMRI) for over a thousand healthy subjects. While the planned scope of the HCP included an anatomic connectome, resting-state fMRI (rs-fMRI) forms the bulk of the HCP''s current connectomic output. We address this by presenting a full-cortex connectome derived from probabilistic diffusion tractography and organized into the HCP-MMP1.0 atlas. Probabilistic methods and large sample sizes are preferable for whole-connectome mapping as they increase the fidelity of traced low-probability connections. We find that overall, connection strengths are lognormally distributed and decay exponentially with tract length, that connectivity reasonably matches macaque histologic tracing in homologous areas, that contralateral homologs and left-lateralized language areas are hyperconnected, and that hierarchical similarity influences connectivity. We compare the dMRI connectome to existing rs-fMRI and cortico-cortico-evoked potential connectivity matrices and find that it is more similar to the latter. This work helps fulfill the promise of the HCP and will make possible comparisons between the underlying structural connectome and functional connectomes of various modalities, brain states, and clinical conditions.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;

