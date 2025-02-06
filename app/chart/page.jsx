"use client";

import DonutChart from "@/components/donutChart";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const formatNameAndColor = (name) => {
  switch (name) {
    case "kbSederajat":
      return { name: "KB/PAUD", color: "#d946ef" };
    case "tkSederajat":
      return { name: "TK", color: "#4f46e5" };
    case "sdSederajat":
      return { name: "SD", color: "#2563eb" };
    case "smpSederajat":
      return { name: "SMP", color: "#0ea5e9" };
    case "smaSederajat":
      return { name: "SMA", color: "#facc15" };
    case "smkSederajat":
      return { name: "SMK", color: "#f97316" };
    case "slb":
      return { name: "SLB", color: "#dc2626" };
    case "tpa":
      return { name: "TPA", color: "#713f12" };
    default:
      return {
        name: name
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/^./, (str) => str.toUpperCase()),
        color: "#0891b2",
      };
  }
};

export default function Chart() {
  const [kodeWilayah, setKodeWilayah] = useState("");
  const [dataProv, setDataProv] = useState(null);
  const [data, setData] = useState([]);

  const getData = async () => {
    if (kodeWilayah) {
      const res = await fetch(
        "https://sheetdb.io/api/v1/zrivwa6xo130e/search?kodeWilayah=" +
          kodeWilayah
      ).then((response) => response.json());

      const newData = Object.entries(res[0])
        .filter(
          ([key]) =>
            key !== "dikmas" &&
            key !== "total" &&
            key !== "kepalaSekolah" &&
            key !== "kodeWilayah" &&
            key !== "kodeWilayahDagri" &&
            key !== "namaWilayah" &&
            key !== "namaWilayahDagri" &&
            key !== "levelWilayah"
        )
        .map(([key, value]) => ({
          name: formatNameAndColor(key).name,
          color: formatNameAndColor(key).color,
          value: value,
        }));
      setData(newData);

      setDataProv({
        namaWilayah: res[0].namaWilayah,
        total: res[0].total,
      });
    }
  };

  const sendDataToFlutter = () => {
    const sendData = {
      kodeWilayah: kodeWilayah,
      namaWilayah: dataProv?.namaWilayah,
      total: dataProv?.total,
    };
    console.log("test", JSON.stringify(sendData));
    if (typeof window !== "undefined") {
      if (window.sendToFlutter) {
        console.log("test2", JSON.stringify(sendData));
        window.sendToFlutter.postMessage(JSON.stringify(sendData));
      }
    }
  };

  useEffect(() => {
    getData();
  }, [kodeWilayah]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.receiveFromFlutter) {
        window.receiveFromFlutter = (kode) => {
          setKodeWilayah(kode);
          console.log("kodee", kode);
        };
      }
    }
  }, []);

  return (
    <motion.div
      className="w-full h-screen bg-white text-black shadow-lg rounded-lg overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full flex flex-col gap-4 p-2">
        <h1 className="text-lg">Data Pendidik dan Tenaga Kependidikan</h1>
        <div className="text-sm">
          <h2>Wilayah: {dataProv?.namaWilayah || "Tidak Ditemukann"}</h2>
          <h2>
            Total: {new Intl.NumberFormat("id-ID").format(dataProv?.total) || 0}
          </h2>
        </div>
        <DonutChart data={data} />
        <div className="w-full flex justify-center">
          <button
            className="w-36 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={sendDataToFlutter}
          >
            Kirim Data
          </button>
        </div>
      </div>
    </motion.div>
  );
}
