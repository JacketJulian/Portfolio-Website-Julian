import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { portfolioData } from '../../data';
import './Projects.css';
import trackEvent from '../../utils/analytics';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import PortfolioItem from '../../components/PortfolioItem/PortfolioItem';
import Pagination from '../../components/Pagination/Pagination';
import { mergeCmsItems } from '../../utils/cmsDrafts';

const ProjectsPage = ({ additionalProjects = [], cmsPreview = null }) => {
  const newProjects = additionalProjects.filter((project) => !project.sourceId);
  const projects = mergeCmsItems('project', portfolioData.projects.projects, additionalProjects);
  const firstDraftId = newProjects.length ? newProjects[newProjects.length - 1].id : null;
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [activeDot, setActiveDot] = useState(newProjects.length ? 0 : Math.min(2, Math.max((portfolioData.projects.projects || []).length - 1, 0)));
  const gridContainerRef = useRef(null);
  const cardRefs = useRef([]);
  const previewRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const ignoreScrollRef = useRef(false);
  const ignoreScrollTimeoutRef = useRef(null);
  const focusFrameRef = useRef(null);
  const previousFirstDraftIdRef = useRef(firstDraftId);
  const hasCmsPreview = Boolean(cmsPreview);
  const activeDotRef = useRef(activeDot);
  const hasCmsPreviewRef = useRef(hasCmsPreview);
  activeDotRef.current = activeDot;
  hasCmsPreviewRef.current = hasCmsPreview;

  const handleShowModal = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProject(null);
  };


  const handleCardClick = (project, index) => {
    if (index !== activeDot) {
      setActiveDot(index);
      return;
    }
    handleShowModal(project);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
  };

  const getClosestIndex = () => {
    const container = gridContainerRef.current;
    if (!container) return activeDot;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + container.clientWidth / 2;
    let closestIndex = activeDot;
    let closestDistance = Infinity;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const handleScroll = () => {
    if (ignoreScrollRef.current) return;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const closestIndex = getClosestIndex();
      if (closestIndex !== activeDot) {
        setActiveDot(closestIndex);
      } else {
        scrollToIndex(closestIndex);
      }
    }, 50);
  };

  const scrollToCard = useCallback((card, behavior = 'smooth') => {
    const container = gridContainerRef.current;
    if (!container || !card) return;
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const containerCenter = containerRect.left + container.clientWidth / 2;
    const cardCenter = cardRect.left + cardRect.width / 2;
    const targetLeft = container.scrollLeft + cardCenter - containerCenter;
    container.scrollTo({ left: targetLeft, behavior });
  }, []);

  const scrollToIndex = useCallback((index, behavior = 'smooth') => {
    scrollToCard(cardRefs.current[index], behavior);
  }, [scrollToCard]);

  useLayoutEffect(() => {
    ignoreScrollRef.current = true;
    if (ignoreScrollTimeoutRef.current) {
      clearTimeout(ignoreScrollTimeoutRef.current);
    }
    ignoreScrollTimeoutRef.current = setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 600);

    if (focusFrameRef.current) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }

    if (hasCmsPreview) {
      scrollToCard(previewRef.current, 'auto');
      focusFrameRef.current = requestAnimationFrame(() => scrollToCard(previewRef.current, 'auto'));
      return;
    }

    if (previousFirstDraftIdRef.current !== firstDraftId) {
      previousFirstDraftIdRef.current = firstDraftId;
      setActiveDot(0);
      scrollToIndex(0, 'auto');
      focusFrameRef.current = requestAnimationFrame(() => scrollToIndex(0, 'auto'));
      return;
    }

    scrollToIndex(activeDot);
  }, [activeDot, firstDraftId, hasCmsPreview, scrollToCard, scrollToIndex]);

  useEffect(() => {
    const handleResize = () => {
      if (hasCmsPreviewRef.current) scrollToCard(previewRef.current, 'auto');
      else scrollToIndex(activeDotRef.current, 'auto');
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (ignoreScrollTimeoutRef.current) {
        clearTimeout(ignoreScrollTimeoutRef.current);
      }
      if (focusFrameRef.current) {
        cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, [scrollToCard, scrollToIndex]);

  const renderProjectsGrid = (projectsList) => (
    projectsList.map((project, index) => (
      project ? (
        <PortfolioItem
          type="project"
          theme="apple"
          item={project}
          className={activeDot === index ? 'current-view' : ''}
          key={project.sourceId || project.id}
          ref={(el) => { cardRefs.current[index] = el; }}
          onClick={() => setActiveDot(index)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveDot(index);
            }
          }}
          onViewProject={(_, source, event) => {
            if (source === 'button') {
              event.stopPropagation();
              setActiveDot(index);
              handleShowModal(project);
            } else {
              handleCardClick(project, index);
            }
          }}
        />
      ) : (
        <div
          className="project-card-placeholder"
          key={index}
        >
          <div className="placeholder-image"></div>
          <div className="placeholder-title"></div>
          <div className="placeholder-description"></div>
        </div>
      )
    ))
  );

  return (
    <div className="projects-container" id="projects" data-testid="projects-section">
      <SectionTitle className="projects-heading section-title-bubble">{portfolioData.projects.title}</SectionTitle>
      <div
        className="projects-grid-container"
        ref={gridContainerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onScroll={handleScroll}
      >
        <div className="projects-grid">
          {cmsPreview && <PortfolioItem ref={previewRef} type="project" theme="apple" item={cmsPreview} className="cms-item-placeholder" data-cms-placeholder="project" aria-hidden="true" inert={true} />}
          {renderProjectsGrid(projects)}
        </div>
      </div>

      <div className="projects-pagination">
        <Pagination
          count={projects.length}
          activeIndex={activeDot}
          onSelect={setActiveDot}
          ariaLabel="Projects pagination"
        />
      </div>

      <ModalWindow show={showModal} handleClose={handleCloseModal} title={selectedProject ? selectedProject.title : ''}>
        {selectedProject && (
          <div>
            {selectedProject.videoUrl && (
              <div className="modal-video-container">
                <video
                  controls
                  className="modal-video"
                  preload="metadata"
                >
                  <source src={selectedProject.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            <p>{selectedProject.description}</p>
            {selectedProject.demoLink && (
            <div className="modal-project-links" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <a
                href={selectedProject.demoLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackEvent('Project Demo Click', { project: selectedProject.title }); }}
                style={{
                  textDecoration: 'none',
                  margin: '0 0.625rem',
                  fontWeight: 'normal',
                  display: 'inline-block',
                  backgroundColor: '#2294fb',
                  color: '#fff',
                  padding: '0.3125rem 1.25rem',
                  borderRadius: '1.25rem',
                  border: '1px solid #2294fb',
                  transition: 'background-color 0.3s ease, color 0.3s ease',
                }}
              >
                {selectedProject.liveDemoText}
              </a>
            </div>
            )}
          </div>
        )}
      </ModalWindow>
    </div>
  );
};

export default ProjectsPage;
