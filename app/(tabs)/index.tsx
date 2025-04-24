import { Image, StyleSheet, Platform, TouchableOpacity, View, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import tw from 'twrnc';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AntDesign, Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';

interface IbadahEntry {
  id: string;
  title: string;
  date: Date;
  category: 'wajib' | 'sunnah';
  completed: boolean;
}

export default function IndexScreen() {
  const [count, setCount] = useState(0);
  const [date, setDate] = useState('');
  const [islamicDate, setIslamicDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [location, setLocation] = useState('Mencari lokasi...');
  const [ibadahTitle, setIbadahTitle] = useState('');
  const [ibadahEntries, setIbadahEntries] = useState<IbadahEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ibadahCategory, setIbadahCategory] = useState<'wajib' | 'sunnah'>('wajib');
  const [editingEntry, setEditingEntry] = useState<IbadahEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'wajib' | 'sunnah'>('wajib');
  const [calendarDates, setCalendarDates] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'wajib' | 'sunnah'>('all');
  
  const [prayerTimes, setPrayerTimes] = useState([
    { name: 'Subuh', time: '04:14', icon: 'moon.stars.fill', color: 'bg-indigo-500' },
    { name: 'Dhuhr', time: '11:39', icon: 'sun.max.fill', color: 'bg-blue-400' },
    { name: 'Asr', time: '14:44', icon: 'cloud.sun.fill', color: 'bg-orange-400' },
    { name: 'Maghrib', time: '17:46', icon: 'moon.fill', color: 'bg-purple-500' },
  ]);

  useEffect(() => {
    // Set current date in Indonesian format
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[today.getDay()];
    const day = today.getDate();
    const month = months[today.getMonth()];
    
    setDate(`${dayName}, ${day} ${month}`);
    setIslamicDate('5 Rabbiul Awwal 1443 H');
    
    // Update time every minute
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    // Load saved ibadah entries
    loadIbadahEntries();
    
    // Generate calendar dates
    generateCalendarDates(calendarMonth, calendarYear);
    
    // Get initial location
    getLocation();
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Save ibadah entries whenever they change
    saveIbadahEntries();
  }, [ibadahEntries]);

  useEffect(() => {
    // Update calendar dates when month or year changes
    generateCalendarDates(calendarMonth, calendarYear);
  }, [calendarMonth, calendarYear]);

  const getLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Lokasi Ditolak', 'Izin untuk mengakses lokasi tidak diberikan.');
        setLocation('Lokasi tidak tersedia');
        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Reverse geocode to get address
      let geocode = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
      
      if (geocode.length > 0) {
        const address = geocode[0];
        const locationString = [
          address.district,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        
        setLocation(locationString || 'Lokasi ditemukan');
      } else {
        setLocation('Lokasi ditemukan');
      }
    } catch (error) {
      console.log('Error getting location:', error);
      setLocation('Gagal mendapatkan lokasi');
      Alert.alert('Error', 'Gagal mendapatkan lokasi Anda.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const generateCalendarDates = (month: number, year: number) => {
    const dates = [];
    
    // Generate dates for the specified month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      dates.push(formatDate(date));
    }
    
    setCalendarDates(dates);
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const loadIbadahEntries = async () => {
    try {
      const saved = await AsyncStorage.getItem('ibadahEntries');
      if (saved !== null) {
        const parsedData = JSON.parse(saved);
        parsedData.forEach((entry: IbadahEntry) => {
          entry.date = new Date(entry.date);
          // Ensure completed property exists for backward compatibility
          if (entry.completed === undefined) {
            entry.completed = false;
          }
        });
        setIbadahEntries(parsedData);
      }
      console.log('Ibadah entries loaded successfully');
    } catch (error) {
      console.log('Failed to load ibadah entries', error);
    }
  };

  const saveIbadahEntries = async () => {
    try {
      await AsyncStorage.setItem('ibadahEntries', JSON.stringify(ibadahEntries));
      console.log('Ibadah entries saved successfully');
    } catch (error) {
      console.log('Failed to save ibadah entries', error);
    }
  };

  const incrementCount = () => {
    if (ibadahTitle.length < 3) {
      Alert.alert('Peringatan', 'Judul ibadah harus minimal 3 karakter');
      return;
    }
    setCount(count + 1);
    
    // Create new ibadah entry
    const newEntry: IbadahEntry = {
      id: Date.now().toString(),
      title: ibadahTitle.trim(),
      date: selectedDate,
      category: ibadahCategory,
      completed: false
    };
    
    // Add to entries list
    setIbadahEntries([...ibadahEntries, newEntry]);
    
    // Show success message
    Alert.alert('Berhasil', `Ibadah "${ibadahTitle}" telah ditambahkan`);
    setIbadahTitle('');
  };

  const onDateChange = (selectedDateStr: string) => {
    // Parse the selected date string
    const [day, month, year] = selectedDateStr.split(' ');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthIndex = months.indexOf(month);
    
    const newDate = new Date(parseInt(year), monthIndex, parseInt(day));
    setSelectedDate(newDate);
    setShowCalendar(false);
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getMonthYearString = (month: number, year: number) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[month]} ${year}`;
  };

  const deleteEntry = (id: string) => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus ibadah ini?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Hapus',
          onPress: () => {
            const updatedEntries = ibadahEntries.filter(entry => entry.id !== id);
            setIbadahEntries(updatedEntries);
            Alert.alert('Berhasil', 'Ibadah telah dihapus');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const editEntry = (entry: IbadahEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditCategory(entry.category);
    setShowEditModal(true);
  };

  const saveEdit = () => {
    if (!editingEntry) return;
    if (editTitle.length < 3) {
      Alert.alert('Peringatan', 'Judul ibadah harus minimal 3 karakter');
      return;
    }

    const updatedEntries = ibadahEntries.map(entry => {
      if (entry.id === editingEntry.id) {
        return {
          ...entry,
          title: editTitle.trim(),
          category: editCategory,
        };
      }
      return entry;
    });

    setIbadahEntries(updatedEntries);
    setShowEditModal(false);
    setEditingEntry(null);
    Alert.alert('Berhasil', 'Ibadah telah diperbarui');
  };

  const toggleCompleted = (id: string) => {
    const updatedEntries = ibadahEntries.map(entry => {
      if (entry.id === id) {
        return {
          ...entry,
          completed: !entry.completed,
        };
      }
      return entry;
    });
    
    setIbadahEntries(updatedEntries);
  };

  // Filter entries based on selected category
  const filteredEntries = ibadahEntries.filter(entry => {
    if (filterCategory === 'all') return true;
    return entry.category === filterCategory;
  });

  return (
    <ScrollView style={tw`flex-1 mt-10 bg-white dark:bg-gray-900`}>
      {/* Date Header */}
      <ThemedView style={tw`px-4 py-2 bg-white dark:bg-gray-800`}>
        <ThemedText style={tw`text-lg font-medium text-gray-800 dark:text-white`}>{date}</ThemedText>
        <ThemedText style={tw`text-sm text-amber-500`}>{islamicDate}</ThemedText>
      </ThemedView>

      {/* Current Prayer Time Card */}
      <ThemedView style={tw`bg-teal-600 rounded-2xl shadow-md mx-4 mt-4 mb-6`}>
        <View style={tw`p-4`}>
          <View style={tw`items-center`}>
            <ThemedText style={tw`text-white text-lg font-medium`}>Waktu Sholat Selanjutnya</ThemedText>
            <ThemedText style={tw`text-white text-3xl font-bold my-1`}>Dzuhur 11:53 PM</ThemedText>
            <View style={tw`flex-row items-center mt-1`}>
              <IconSymbol name="mappin.circle.fill" size={16} color="#ffffff" />
              <ThemedText style={tw`text-white text-xs ml-1`}>{location}</ThemedText>
            </View>
            <TouchableOpacity 
              style={tw`bg-white bg-opacity-20 rounded-lg px-3 py-1 mt-2 flex-row items-center ${isLoadingLocation ? 'opacity-50' : ''}`}
              onPress={getLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <View style={tw`mr-1`}>
                  <AntDesign name="loading1" size={12} color="#ffffff" />
                </View>
              ) : (
                <View style={tw`mr-1`}>
                  <MaterialIcons name="gps-fixed" size={12} color="#ffffff" />
                </View>
              )}
              <ThemedText style={tw`text-white text-xs`}>
                {isLoadingLocation ? 'Memperbarui...' : 'Perbarui Lokasi'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>

      {/* Prayer Times Grid */}
      <ThemedView style={tw`mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 mb-6`}>
        <ThemedText style={tw`text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200`}>Prayer Times</ThemedText>
        <View style={tw`flex-row flex-wrap justify-between`}>
        {prayerTimes.map((prayer, index) => (
            <View key={index} style={tw`w-[48%] ${prayer.color} p-4 rounded-xl mb-3 shadow-sm`}>
              <ThemedText style={tw`text-white text-sm font-medium`}>Prayer Time</ThemedText>
              <ThemedText style={tw`text-white text-lg font-bold`}>{prayer.name}</ThemedText>
              <View style={tw`flex-row justify-between items-center mt-2`}>
                <ThemedText style={tw`text-white text-base`}>
                  {prayer.time}{prayer.name === 'Subuh' ? 'am' : 'pm'}
                </ThemedText>
                <IconSymbol name={prayer.icon} size={24} color="#ffffff" />
              </View>
            </View>
          ))}
        </View>
      </ThemedView>

      {/* Ibadah Form */}
      <ThemedView style={tw`mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 mb-6`}>
        <ThemedText style={tw`text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200`}>Tambah Ibadah</ThemedText>
        
        {/* Ibadah Title Input */}
        <TextInput
          style={tw`bg-gray-200 dark:bg-gray-700 p-4 rounded-lg mb-3 text-black dark:text-white`}
          placeholder="Nama Ibadah"
          placeholderTextColor={tw.color('gray-500')}
          value={ibadahTitle}
          onChangeText={setIbadahTitle}
        />
        
        {/* Date Picker */}
        <View style={tw`flex-row mb-3`}>
          <TouchableOpacity
            style={tw`bg-gray-200 dark:bg-gray-700 p-4 text-black rounded-lg flex-1 mr-1`}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <ThemedText style={tw`text-black dark:text-white`}>
              {formatDate(selectedDate)}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-purple-800 p-4 rounded-lg text-black justify-center items-center`}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <AntDesign name="calendar" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Custom Calendar */}
        {showCalendar && (
          <View style={tw`bg-gray-200 dark:bg-gray-700 p-4 rounded-lg mb-3`}>
            {/* Month Navigation */}
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <TouchableOpacity 
                style={tw`p-2`}
                onPress={prevMonth}
              >
                <AntDesign name="left" size={16} color={tw.color('gray-700 dark:gray-300')} />
              </TouchableOpacity>
              
              <ThemedText style={tw`text-black dark:text-white font-bold`}>
                {getMonthYearString(calendarMonth, calendarYear)}
              </ThemedText>
              
              <TouchableOpacity 
                style={tw`p-2`}
                onPress={nextMonth}
              >
                <AntDesign name="right" size={16} color={tw.color('gray-700 dark:gray-300')} />
              </TouchableOpacity>
            </View>
            
            <View style={tw`flex-row flex-wrap justify-between`}>
              {calendarDates.map((dateStr, index) => (
                <TouchableOpacity 
                  key={index}
                  style={tw`w-[13%] h-10 bg-white dark:bg-gray-600 rounded-lg mb-2 items-center justify-center ${
                    dateStr === formatDate(selectedDate) ? 'bg-purple-800 dark:bg-purple-800' : ''
                  }`}
                  onPress={() => onDateChange(dateStr)}
                >
                  <ThemedText 
                    style={tw`${
                      dateStr === formatDate(selectedDate) ? 'text-white' : 'text-black dark:text-white'
                    } text-xs`}
                  >
                    {dateStr.split(' ')[0]}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={tw`bg-purple-800 p-2 rounded-lg items-center mt-2`}
              onPress={() => setShowCalendar(false)}
            >
              <ThemedText style={tw`text-white`}>Tutup</ThemedText>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Category Picker */}
        <View style={tw`bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden`}>
          <Picker
            selectedValue={ibadahCategory}
            onValueChange={(itemValue) => setIbadahCategory(itemValue as 'wajib' | 'sunnah')}
            style={tw`text-black dark:text-white`}
            dropdownIconColor={tw.color('gray-500')}
          >
            <Picker.Item label="Wajib" value="wajib" />
            <Picker.Item label="Sunnah" value="sunnah" />
          </Picker>
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity
          style={tw`bg-purple-800 p-4 rounded-lg mb-2 justify-center items-center ${ibadahTitle.trim().length < 3 ? 'opacity-50' : ''}`}
          onPress={incrementCount}
          disabled={ibadahTitle.trim().length < 3}
        >
          <ThemedText style={tw`text-white text-center font-bold`}>Tambah Ibadah</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Recent Ibadah Entries */}
      {ibadahEntries.length > 0 && (
        <ThemedView style={tw`mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 mb-6`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <ThemedText style={tw`text-lg font-semibold text-gray-800 dark:text-gray-200`}>Riwayat Ibadah</ThemedText>
            
                       {/* Filter Buttons */}
                       <View style={tw`flex-row bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden`}>
              <TouchableOpacity 
                style={tw`px-3 py-1 ${filterCategory === 'all' ? 'bg-purple-800' : ''}`}
                onPress={() => setFilterCategory('all')}
              >
                <ThemedText style={tw`${filterCategory === 'all' ? 'text-white' : 'text-gray-700 dark:text-gray-300'} text-xs`}>
                  Semua
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={tw`px-3 py-1 ${filterCategory === 'wajib' ? 'bg-purple-800' : ''}`}
                onPress={() => setFilterCategory('wajib')}
              >
                <ThemedText style={tw`${filterCategory === 'wajib' ? 'text-white' : 'text-gray-700 dark:text-gray-300'} text-xs`}>
                  Wajib
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={tw`px-3 py-1 ${filterCategory === 'sunnah' ? 'bg-purple-800' : ''}`}
                onPress={() => setFilterCategory('sunnah')}
              >
                <ThemedText style={tw`${filterCategory === 'sunnah' ? 'text-white' : 'text-gray-700 dark:text-gray-300'} text-xs`}>
                  Sunnah
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          {filteredEntries.slice(-5).reverse().map((entry) => (
            <View key={entry.id} style={tw`py-3 px-4 my-1 bg-gray-100 dark:bg-gray-700 rounded-lg`}>
              <View style={tw`flex-row justify-between items-center`}>
                <TouchableOpacity 
                  style={tw`mr-2`}
                  onPress={() => toggleCompleted(entry.id)}
                >
                  {entry.completed ? (
                    <View style={tw`w-6 h-6 bg-green-500 rounded-full items-center justify-center`}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                  ) : (
                    <View style={tw`w-6 h-6 border-2 border-gray-400 dark:border-gray-500 rounded-full`} />
                  )}
                </TouchableOpacity>
                
                <ThemedText 
                  style={tw`text-gray-800 dark:text-white text-lg flex-1 ${entry.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}
                >
                  {entry.title}
                </ThemedText>
                
                <View style={tw`flex-row`}>
                  <TouchableOpacity 
                    style={tw`mr-2`} 
                    onPress={() => editEntry(entry)}
                  >
                    <Feather name="edit" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={tw`flex-row justify-between mt-1 ml-8`}>
                <ThemedText style={tw`text-gray-500 dark:text-gray-400 text-sm`}>{formatDate(new Date(entry.date))}</ThemedText>
                <View style={tw`${entry.category === 'wajib' ? 'bg-blue-500' : 'bg-green-500'} px-2 py-0.5 rounded-full`}>
                  <ThemedText style={tw`text-white text-xs`}>{entry.category === 'wajib' ? 'Wajib' : 'Sunnah'}</ThemedText>
                </View>
              </View>
            </View>
          ))}
          
          {filteredEntries.length > 5 && (
            <TouchableOpacity style={tw`mt-3 items-center`}>
              <ThemedText style={tw`text-purple-600 dark:text-purple-400`}>Lihat Semua</ThemedText>
            </TouchableOpacity>
          )}
          
          {filteredEntries.length === 0 && (
            <View style={tw`py-8 items-center`}>
              <ThemedText style={tw`text-gray-500 dark:text-gray-400 text-center`}>
                Tidak ada ibadah {filterCategory !== 'all' ? (filterCategory === 'wajib' ? 'wajib' : 'sunnah') : ''} yang ditemukan
              </ThemedText>
            </View>
          )}
        </ThemedView>
      )}

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white dark:bg-gray-800 p-5 rounded-xl w-[90%]`}>
            <ThemedText style={tw`text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200`}>Edit Ibadah</ThemedText>
            
            {/* Edit Title Input */}
            <TextInput
              style={tw`bg-gray-200 dark:bg-gray-700 p-4 rounded-lg mb-3 text-black dark:text-white`}
              placeholder="Nama Ibadah"
              placeholderTextColor={tw.color('gray-500')}
              value={editTitle}
              onChangeText={setEditTitle}
            />
            
            {/* Edit Category Picker */}
            <View style={tw`bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden`}>
              <Picker
                selectedValue={editCategory}
                onValueChange={(itemValue) => setEditCategory(itemValue as 'wajib' | 'sunnah')}
                style={tw`text-black dark:text-white`}
                dropdownIconColor={tw.color('gray-500')}
              >
                <Picker.Item label="Wajib" value="wajib" />
                <Picker.Item label="Sunnah" value="sunnah" />
              </Picker>
            </View>
            
            {/* Modal Buttons */}
            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                style={tw`bg-gray-300 dark:bg-gray-600 p-3 rounded-lg flex-1 mr-2 items-center`}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={tw`text-gray-800 dark:text-white font-medium`}>Batal</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={tw`bg-purple-800 p-3 rounded-lg flex-1 ml-2 items-center ${editTitle.trim().length < 3 ? 'opacity-50' : ''}`}
                onPress={saveEdit}
                disabled={editTitle.trim().length < 3}
              >
                <ThemedText style={tw`text-white font-medium`}>Simpan</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}