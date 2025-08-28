import React, { useState, useEffect } from 'react';
import { AssessmentConfiguration, Grade, Subject } from '../types';
import { assessmentConfigAPI, gradesAPI, subjectsAPI } from '../services/api';
import { Edit, Trash2, Plus, Filter, Clock, Hash, AlertTriangle } from 'lucide-react';
import AssessmentConfigForm from './AssessmentConfigForm';

const AssessmentConfigList: React.FC = () => {
  const [configurations, setConfigurations] = useState<AssessmentConfiguration[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AssessmentConfiguration | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [filteredConfigs, setFilteredConfigs] = useState<AssessmentConfiguration[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter configurations based on selected grade and subject
    let filtered = configurations;
    
    if (selectedGrade !== null) {
      filtered = filtered.filter(config => config.gradeId === selectedGrade);
    }
    
    if (selectedSubject !== null) {
      filtered = filtered.filter(config => config.subjectId === selectedSubject);
    }
    
    setFilteredConfigs(filtered);
  }, [selectedGrade, selectedSubject, configurations]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configsData, gradesData, subjectsData] = await Promise.all([
        assessmentConfigAPI.getAll(),
        gradesAPI.getActive(),
        subjectsAPI.getAll()
      ]);
      
      setConfigurations(configsData);
      setGrades(gradesData);
      setSubjects(subjectsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load assessment configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setShowForm(true);
  };

  const handleEdit = (config: AssessmentConfiguration) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await assessmentConfigAPI.delete(id);
      setConfigurations(configs => configs.filter(config => config.id !== id));
    } catch (err) {
      console.error('Error deleting configuration:', err);
      alert('Failed to delete configuration');
    }
  };

  const handleFormSubmit = async (configData: any) => {
    try {
      if (editingConfig) {
        const updated = await assessmentConfigAPI.update(editingConfig.id, configData);
        setConfigurations(configs => 
          configs.map(config => config.id === editingConfig.id ? updated : config)
        );
      } else {
        const newConfig = await assessmentConfigAPI.create(configData);
        setConfigurations(configs => [...configs, newConfig]);
      }
      setShowForm(false);
      setEditingConfig(null);
    } catch (err) {
      console.error('Error saving configuration:', err);
      alert('Failed to save configuration');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  const getGradeName = (gradeId: number) => {
    const grade = grades.find(g => g.id === gradeId);
    return grade?.display_name || 'Unknown Grade';
  };

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Configurations</h2>
          <p className="text-gray-600 mt-1">
            Manage time limits and question counts for each grade-subject combination
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Configuration</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          
          <select
            value={selectedGrade || ''}
            onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.display_name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConfigs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {config.gradeName || getGradeName(config.gradeId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {config.subjectName || getSubjectName(config.subjectId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {config.timeLimitMinutes} minutes
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {config.questionCount} questions
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      config.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredConfigs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {configurations.length === 0 ? (
                <div>
                  <p className="text-lg font-medium">No configurations found</p>
                  <p className="text-sm mt-1">Create your first assessment configuration to get started.</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">No configurations match your filters</p>
                  <p className="text-sm mt-1">Try adjusting your filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Form Modal */}
      {showForm && (
        <AssessmentConfigForm
          config={editingConfig}
          grades={grades}
          subjects={subjects}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default AssessmentConfigList;
