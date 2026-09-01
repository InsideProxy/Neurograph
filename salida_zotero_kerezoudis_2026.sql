-- Generado por study_insert_sql() (backend/ingestion/literature/study_metadata.py)
-- Fase 6, primer Study real cargado desde la biblioteca de Zotero de la usuaria
-- (decision 26 de docs/analisis-arquitectura.md).
-- Metadatos verificados contra Crossref (api.crossref.org/works/10.1073/pnas.2517734123)
-- el 31/08/2026, no copiados sin comprobar de Zotero.

INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (
  'study.human.zotero.kerezoudis_2026', 'Kerezoudis P, Jensen MA, Klassen BT, et al. (2026). The human insula encodes somatotopic representation of motor execution with an effector-specific connectome map to primary motor cortex. Proceedings of the National Academy of Sciences, 123(8), e2517734123.', '10.1073/pnas.2517734123', 2026,
  ARRAY['Kerezoudis P', 'Jensen MA', 'Klassen BT', 'Worrell GA', 'Gregg NM', 'Ince NF', 'Van Gompel JJ', 'Hermes D', 'Miller KJ'], 'Proceedings of the National Academy of Sciences', 'Understanding motor representation in the human brain requires mapping beyond the primary motor cortex, into the distributed networks that coordinate complex movements. The insular cortex, a multifunctional hub buried within the Sylvian fissure, has been implicated in motor control through clinical observations and neuroimaging. Yet its precise relation to primary sensorimotor processing remains one of the least understood aspects of motor neurophysiology. To address this gap, we quantified electrophysiological changes from implanted depth electrodes in patients performing simple movement tasks combined with single-pulse electrical stimulation (SPES) to map effective connectivity. The movement data reveal somatotopically specific representation bilaterally, as well as intereffector regions that are active for different movement types. Hand representation is centered along the contralateral ventral aspect of the middle and posterior short gyri bilaterally, while tongue/mouth tuned sites cluster in the dorsal posterior short gyrus and the dorsal long gyri. Insular activity temporally follows the primary motor cortex (M1) and precedes movement onset. SPES revealed somatotopically specific connectivity between corresponding sites in M1 and insula (hand-to-hand, tongue-to-tongue) and between bilateral insulae. These observations establish that somatotopy is a conserved property of distributed motor control incorporating the insular representations and connectivity.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  doi = EXCLUDED.doi,
  year = EXCLUDED.year,
  authors = EXCLUDED.authors,
  journal = EXCLUDED.journal,
  abstract = EXCLUDED.abstract;
